"""
API routes for the test case generator
"""

import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.models.schemas import (
    IngestRequest, IngestResponse, RunStatus, GenerateRequest, GenerateResponse,
    RunHistory, ErrorResponse
)
from app.core.store import RunStore, RunStatus as StoreRunStatus
from app.services.file_reader import FileReader, TextChunker
from app.services.simple_workflow import SimpleTestCaseWorkflow
from app.core.config import settings

router = APIRouter()

# Global instances
run_store = RunStore()
workflow = SimpleTestCaseWorkflow(run_store)


@router.post("/ingest", response_model=IngestResponse)
async def ingest_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    llm_provider: str = "openai",
    model: str = settings.default_model,
    max_cases: int = 50,
    repair_attempts: int = 1,
    enable_coverage_auditor: bool = True
):
    """
    Upload and ingest requirement documents
    
    Args:
        files: List of uploaded files (PDF, DOCX, TXT)
        llm_provider: LLM provider to use
        model: Model name to use
        max_cases: Maximum number of test cases to generate
        repair_attempts: Number of JSON repair attempts
        enable_coverage_auditor: Enable coverage auditing
    """
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if not settings.allow_multiple_files and len(files) > 1:
        raise HTTPException(status_code=400, detail="Multiple files not allowed")
    
    # Validate files
    for file in files:
        if not FileReader.is_supported(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format: {file.filename}"
            )
    
    try:
        # Create run
        primary_filename = files[0].filename
        run_id = run_store.create_run(
            filename=primary_filename,
            llm_provider=llm_provider,
            model=model,
            max_cases=max_cases,
            repair_attempts=repair_attempts
        )
        
        # Update status
        run_store.update_run(run_id, status=StoreRunStatus.UPLOADING)
        
        # Process files in background
        background_tasks.add_task(
            _process_uploaded_files,
            run_id,
            files
        )
        
        return IngestResponse(
            run_id=run_id,
            message="Files uploaded successfully. Processing started."
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


async def _process_uploaded_files(run_id: str, files: List[UploadFile]):
    """Background task to process uploaded files"""
    try:
        run_state = run_store.get_run(run_id)
        if not run_state:
            return
        
        # Create upload directory
        upload_dir = f"uploads/{run_id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save and process files
        all_text_parts = []
        total_size = 0
        
        for file in files:
            # Save file
            file_path = f"{upload_dir}/{file.filename}"
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Read file content
            text, file_size = await FileReader.read_file(file_path, file.filename)
            all_text_parts.append(text)
            total_size += file_size
        
        # Combine all text
        combined_text = "\n\n--- DOCUMENT SEPARATOR ---\n\n".join(all_text_parts)
        
        # Chunk text
        chunker = TextChunker(
            chunk_size=settings.chunk_size,
            overlap=settings.chunk_overlap
        )
        chunks = chunker.chunk_text(combined_text)
        
        # Extract requirement IDs
        requirement_ids = chunker.extract_requirement_ids(combined_text)
        
        # Update run state
        run_store.update_run(run_id,
            raw_text=combined_text,
            chunks=chunks,
            file_size=total_size,
            status=StoreRunStatus.PENDING
        )
        
        # Clean up upload files
        shutil.rmtree(upload_dir, ignore_errors=True)
        
    except Exception as e:
        run_store.update_run(run_id,
            status=StoreRunStatus.FAILED,
            error_message=f"File processing failed: {str(e)}"
        )


@router.get("/status/{run_id}", response_model=RunStatus)
async def get_run_status(run_id: str):
    """Get the status of a processing run"""
    run_state = run_store.get_run(run_id)
    
    if not run_state:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return RunStatus(
        run_id=run_state.run_id,
        status=run_state.status.value,
        current_node=run_state.current_node,
        progress_percentage=run_state.progress_percentage,
        created_at=run_state.created_at,
        updated_at=run_state.updated_at,
        completed_at=run_state.completed_at,
        test_case_count=len(run_state.test_cases),
        error_message=run_state.error_message,
        filename=run_state.filename
    )


@router.post("/generate/{run_id}", response_model=GenerateResponse)
async def generate_test_cases(
    run_id: str,
    request: GenerateRequest = GenerateRequest()
):
    """Trigger or continue test case generation for a run"""
    run_state = run_store.get_run(run_id)
    
    if not run_state:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if run_state.status == StoreRunStatus.COMPLETED:
        return GenerateResponse(
            run_id=run_id,
            status="completed",
            message="Test cases already generated"
        )
    
    if run_state.status == StoreRunStatus.FAILED and not request.force_restart:
        raise HTTPException(
            status_code=400, 
            detail="Run failed. Use force_restart=true to retry."
        )
    
    try:
        # Reset state if force restart
        if request.force_restart:
            run_store.update_run(run_id,
                status=StoreRunStatus.PENDING,
                current_node=None,
                progress_percentage=0,
                test_cases=[],
                validation_issues=[],
                coverage_gaps=[],
                error_message=None
            )
        
        # Start workflow
        result = await workflow.run_workflow(run_id)
        
        return GenerateResponse(
            run_id=run_id,
            status=result["status"],
            message=f"Generation {result['status']}. {result.get('test_case_count', 0)} test cases generated."
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.get("/artifacts/{run_id}/testcases.json")
async def download_test_cases_json(run_id: str):
    """Download test cases as JSON"""
    run_state = run_store.get_run(run_id)
    
    if not run_state:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if run_state.status != StoreRunStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Run not completed")
    
    json_path = f"artifacts/{run_id}/testcases.json"
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="JSON file not found")
    
    return FileResponse(
        path=json_path,
        filename=f"testcases_{run_id}.json",
        media_type="application/json"
    )


@router.get("/artifacts/{run_id}/testcases.csv")
async def download_test_cases_csv(run_id: str):
    """Download test cases as CSV"""
    run_state = run_store.get_run(run_id)
    
    if not run_state:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if run_state.status != StoreRunStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Run not completed")
    
    csv_path = f"artifacts/{run_id}/testcases.csv"
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="CSV file not found")
    
    return FileResponse(
        path=csv_path,
        filename=f"testcases_{run_id}.csv",
        media_type="text/csv"
    )


@router.get("/artifacts/{run_id}/traceability.json")
async def download_traceability_matrix(run_id: str):
    """Download requirement traceability matrix"""
    run_state = run_store.get_run(run_id)
    
    if not run_state:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if run_state.status != StoreRunStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Run not completed")
    
    trace_path = f"artifacts/{run_id}/traceability.json"
    if not os.path.exists(trace_path):
        raise HTTPException(status_code=404, detail="Traceability file not found")
    
    return FileResponse(
        path=trace_path,
        filename=f"traceability_{run_id}.json",
        media_type="application/json"
    )


@router.get("/history", response_model=List[RunHistory])
async def get_run_history(limit: int = 50):
    """Get history of previous runs"""
    runs = run_store.list_runs(limit=limit)
    
    return [
        RunHistory(
            run_id=run.run_id,
            filename=run.filename or "Unknown",
            status=run.status.value,
            created_at=run.created_at,
            completed_at=run.completed_at,
            test_case_count=len(run.test_cases),
            llm_provider=run.llm_provider,
            model=run.model
        )
        for run in runs
    ]


@router.delete("/runs/{run_id}")
async def delete_run(run_id: str):
    """Delete a run and its artifacts"""
    run_state = run_store.get_run(run_id)
    
    if not run_state:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Delete artifacts
    artifacts_dir = f"artifacts/{run_id}"
    if os.path.exists(artifacts_dir):
        shutil.rmtree(artifacts_dir)
    
    # Delete from store
    success = run_store.delete_run(run_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete run")
    
    return {"message": "Run deleted successfully"}


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "features": {
        "coverage_auditor": settings.coverage_auditor_enabled,
        "multiple_files": settings.allow_multiple_files,
        "max_file_size_mb": settings.max_file_size_mb
        }
    }
