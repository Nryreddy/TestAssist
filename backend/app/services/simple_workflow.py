"""
Simplified workflow for test case generation (without LangGraph for compatibility)
"""

import json
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.models.schemas import TestCase, Priority, TestCaseType
from app.services.llm_client import LLMClientFactory, PromptTemplates
from app.core.config import settings
from app.core.store import RunState, RunStatus


class SimpleTestCaseWorkflow:
    """Simplified multi-agent workflow for test case generation"""
    
    def __init__(self, run_store):
        self.run_store = run_store
    
    async def run_workflow(self, run_id: str) -> Dict[str, Any]:
        """Execute the workflow for a given run"""
        run_state = self.run_store.get_run(run_id)
        if not run_state:
            raise ValueError(f"Run {run_id} not found")
        
        try:
            # Step 1: Feature Analysis
            self.run_store.update_run(run_id,
                status=RunStatus.ANALYZING,
                current_node="feature_analyzer",
                progress_percentage=25
            )
            
            features_summary = await self._analyze_features(run_state)
            self.run_store.update_run(run_id, features_summary=features_summary)
            
            # Step 2: Test Case Generation
            self.run_store.update_run(run_id,
                status=RunStatus.GENERATING,
                current_node="test_generator",
                progress_percentage=50
            )
            
            test_cases = await self._generate_test_cases(features_summary, run_state)
            
            # Step 3: Validation
            self.run_store.update_run(run_id,
                status=RunStatus.VALIDATING,
                current_node="validator",
                progress_percentage=70
            )
            
            validated_cases, validation_issues = await self._validate_test_cases(test_cases, run_state)
            self.run_store.update_run(run_id, 
                test_cases=validated_cases,
                validation_issues=validation_issues
            )
            
            # Step 4: Export
            self.run_store.update_run(run_id,
                status=RunStatus.EXPORTING,
                current_node="formatter",
                progress_percentage=95
            )
            
            artifacts_path = await self._export_artifacts(run_id, validated_cases)
            
            # Step 5: Complete
            self.run_store.update_run(run_id,
                status=RunStatus.COMPLETED,
                current_node="formatter",
                progress_percentage=100,
                completed_at=datetime.utcnow(),
                test_case_count=len(validated_cases),
                artifacts_path=artifacts_path
            )
            
            return {
                "status": "completed",
                "test_case_count": len(validated_cases),
                "validation_issues": validation_issues,
                "artifacts_path": artifacts_path
            }
        
        except Exception as e:
            # Update run state with error
            self.run_store.update_run(run_id,
                status=RunStatus.FAILED,
                error_message=str(e)
            )
            
            return {
                "status": "failed",
                "error_message": str(e)
            }
    
    async def _analyze_features(self, run_state: RunState) -> str:
        """Analyze features from the requirement text"""
        llm_client = LLMClientFactory.create_client(
            provider=run_state.llm_provider,
            model=run_state.model
        )
        
        # Analyze each chunk and combine results
        all_features = []
        for i, chunk in enumerate(run_state.chunks):
            messages = [
                {"role": "system", "content": PromptTemplates.get_analyzer_system_prompt()},
                {"role": "user", "content": PromptTemplates.get_analyzer_user_prompt(chunk)}
            ]
            
            response = await llm_client.generate_completion(messages)
            all_features.append(f"--- Chunk {i+1} Analysis ---\n{response}")
        
        return "\n\n".join(all_features)
    
    async def _generate_test_cases(self, features_summary: str, run_state: RunState) -> List[Dict[str, Any]]:
        """Generate test cases from features summary"""
        llm_client = LLMClientFactory.create_client(
            provider=run_state.llm_provider,
            model=run_state.model
        )
        
        messages = [
            {"role": "system", "content": PromptTemplates.get_generator_system_prompt()},
            {"role": "user", "content": PromptTemplates.get_generator_user_prompt(
                features_summary, 
                run_state.max_cases
            )}
        ]
        
        response = await llm_client.generate_completion(messages)
        
        # Parse JSON response
        try:
            test_cases = json.loads(response)
            if not isinstance(test_cases, list):
                test_cases = [test_cases]
            return test_cases
        except json.JSONDecodeError:
            # Return raw response for validator to repair
            return [{"raw_response": response}]
    
    async def _validate_test_cases(self, test_cases: List[Dict[str, Any]], run_state: RunState) -> tuple:
        """Validate and repair test cases"""
        validation_issues = []
        validated_cases = []
        
        # Check if we have raw response that needs repair
        if len(test_cases) == 1 and "raw_response" in test_cases[0]:
            # Attempt to repair JSON
            llm_client = LLMClientFactory.create_client(
                provider=run_state.llm_provider,
                model=run_state.model
            )
            
            messages = [
                {"role": "system", "content": PromptTemplates.get_validator_system_prompt()},
                {"role": "user", "content": PromptTemplates.get_validator_user_prompt(
                    test_cases[0]["raw_response"]
                )}
            ]
            
            response = await llm_client.generate_completion(messages)
            
            try:
                repaired_cases = json.loads(response)
                if not isinstance(repaired_cases, list):
                    repaired_cases = [repaired_cases]
                
                test_cases = repaired_cases
                validation_issues.append("JSON was repaired by validator")
                
            except json.JSONDecodeError:
                validation_issues.append("Failed to repair JSON - invalid format")
                return [], validation_issues
        
        # Validate each test case against schema
        for i, case in enumerate(test_cases):
            try:
                # Validate using Pydantic model
                validated_case = TestCase(**case)
                validated_cases.append(validated_case.dict())
                
            except Exception as e:
                validation_issues.append(f"Test case {i+1} validation failed: {str(e)}")
        
        return validated_cases, validation_issues
    
    async def _export_artifacts(self, run_id: str, test_cases: List[Dict[str, Any]]) -> str:
        """Export test cases to JSON and CSV"""
        import os
        
        # Create artifacts directory
        artifacts_dir = f"artifacts/{run_id}"
        os.makedirs(artifacts_dir, exist_ok=True)
        
        # Export JSON
        json_path = f"{artifacts_dir}/testcases.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(test_cases, f, indent=2, ensure_ascii=False)
        
        # Export CSV
        csv_path = f"{artifacts_dir}/testcases.csv"
        self._export_to_csv(test_cases, csv_path)
        
        # Create traceability matrix
        trace_path = f"{artifacts_dir}/traceability.json"
        self._create_traceability_matrix(test_cases, trace_path)
        
        return artifacts_dir
    
    def _export_to_csv(self, test_cases: List[Dict[str, Any]], csv_path: str):
        """Export test cases to CSV format"""
        import pandas as pd
        
        # Flatten test cases for CSV
        csv_data = []
        for case in test_cases:
            csv_data.append({
                "id": case.get("id", ""),
                "title": case.get("title", ""),
                "requirement_ids": "; ".join(case.get("requirement_ids", [])),
                "preconditions": "; ".join(case.get("preconditions", [])),
                "steps": "; ".join(case.get("steps", [])),
                "expected_result": case.get("expected_result", ""),
                "priority": case.get("priority", ""),
                "type": case.get("type", "")
            })
        
        df = pd.DataFrame(csv_data)
        df.to_csv(csv_path, index=False, encoding='utf-8')
    
    def _create_traceability_matrix(self, test_cases: List[Dict[str, Any]], trace_path: str):
        """Create requirement to test case traceability matrix"""
        traceability = {}
        
        for case in test_cases:
            case_id = case.get("id", "")
            req_ids = case.get("requirement_ids", [])
            
            for req_id in req_ids:
                if req_id not in traceability:
                    traceability[req_id] = []
                traceability[req_id].append({
                    "test_case_id": case_id,
                    "title": case.get("title", ""),
                    "type": case.get("type", ""),
                    "priority": case.get("priority", "")
                })
        
        with open(trace_path, 'w', encoding='utf-8') as f:
            json.dump(traceability, f, indent=2, ensure_ascii=False)

