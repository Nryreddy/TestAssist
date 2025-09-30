"""
LangGraph workflow for multi-agent test case generation
"""

import json
import re
from typing import Dict, Any, List, Optional, TypedDict
from datetime import datetime

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from app.models.schemas import TestCase, Priority, TestCaseType
from app.services.llm_client import LLMClientFactory, PromptTemplates
from app.core.config import settings
from app.core.store import RunState, RunStatus


class WorkflowState(TypedDict):
    """State for the LangGraph workflow"""
    run_id: str
    raw_text: str
    chunks: List[str]
    features_summary: str
    test_cases: List[Dict[str, Any]]
    validation_issues: List[str]
    coverage_gaps: List[str]
    additional_test_cases: List[Dict[str, Any]]
    artifacts_path: str
    error_message: Optional[str]


class TestCaseWorkflow:
    """Multi-agent workflow for test case generation"""
    
    def __init__(self, run_store):
        self.run_store = run_store
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        workflow = StateGraph(WorkflowState)
        
        # Add nodes
        workflow.add_node("requirement_reader", self._requirement_reader_node)
        workflow.add_node("feature_analyzer", self._feature_analyzer_node)
        workflow.add_node("test_generator", self._test_generator_node)
        workflow.add_node("validator", self._validator_node)
        workflow.add_node("coverage_auditor", self._coverage_auditor_node)
        workflow.add_node("gap_generator", self._gap_generator_node)
        workflow.add_node("formatter", self._formatter_node)
        
        # Define edges
        workflow.set_entry_point("requirement_reader")
        workflow.add_edge("requirement_reader", "feature_analyzer")
        workflow.add_edge("feature_analyzer", "test_generator")
        workflow.add_edge("test_generator", "validator")
        
        # Conditional edge from validator
        workflow.add_conditional_edges(
            "validator",
            self._should_audit_coverage,
            {
                "audit": "coverage_auditor",
                "format": "formatter"
            }
        )
        
        workflow.add_conditional_edges(
            "coverage_auditor",
            self._has_coverage_gaps,
            {
                "generate_gaps": "gap_generator",
                "format": "formatter"
            }
        )
        
        workflow.add_edge("gap_generator", "formatter")
        workflow.add_edge("formatter", END)
        
        return workflow.compile(checkpointer=MemorySaver())
    
    async def _requirement_reader_node(self, state: WorkflowState) -> WorkflowState:
        """Requirement reader agent node"""
        run_id = state["run_id"]
        run_state = self.run_store.get_run(run_id)
        
        if not run_state:
            state["error_message"] = "Run not found"
            return state
        
        try:
            self.run_store.update_run(run_id, 
                status=RunStatus.READING,
                current_node="requirement_reader",
                progress_percentage=10
            )
            
            # Text is already extracted and stored in run_state
            state["raw_text"] = run_state.raw_text
            state["chunks"] = run_state.chunks
            
            return state
        
        except Exception as e:
            state["error_message"] = f"Requirement reader error: {str(e)}"
            return state
    
    async def _feature_analyzer_node(self, state: WorkflowState) -> WorkflowState:
        """Feature analyzer agent node"""
        run_id = state["run_id"]
        run_state = self.run_store.get_run(run_id)
        
        try:
            self.run_store.update_run(run_id,
                status=RunStatus.ANALYZING,
                current_node="feature_analyzer",
                progress_percentage=25
            )
            
            # Create LLM client
            llm_client = LLMClientFactory.create_client(
                provider=run_state.llm_provider,
                model=run_state.model
            )
            
            # Analyze each chunk and combine results
            all_features = []
            for i, chunk in enumerate(state["chunks"]):
                messages = [
                    {"role": "system", "content": PromptTemplates.get_analyzer_system_prompt()},
                    {"role": "user", "content": PromptTemplates.get_analyzer_user_prompt(chunk)}
                ]
                
                response = await llm_client.generate_completion(messages)
                all_features.append(f"--- Chunk {i+1} Analysis ---\n{response}")
            
            # Combine all feature analyses
            features_summary = "\n\n".join(all_features)
            state["features_summary"] = features_summary
            
            # Update run state
            self.run_store.update_run(run_id, features_summary=features_summary)
            
            return state
        
        except Exception as e:
            state["error_message"] = f"Feature analyzer error: {str(e)}"
            return state
    
    async def _test_generator_node(self, state: WorkflowState) -> WorkflowState:
        """Test case generator agent node"""
        run_id = state["run_id"]
        run_state = self.run_store.get_run(run_id)
        
        try:
            self.run_store.update_run(run_id,
                status=RunStatus.GENERATING,
                current_node="test_generator",
                progress_percentage=50
            )
            
            # Create LLM client
            llm_client = LLMClientFactory.create_client(
                provider=run_state.llm_provider,
                model=run_state.model
            )
            
            # Generate test cases
            messages = [
                {"role": "system", "content": PromptTemplates.get_generator_system_prompt()},
                {"role": "user", "content": PromptTemplates.get_generator_user_prompt(
                    state["features_summary"], 
                    run_state.max_cases
                )}
            ]
            
            response = await llm_client.generate_completion(messages)
            
            # Parse JSON response
            try:
                test_cases = json.loads(response)
                if not isinstance(test_cases, list):
                    test_cases = [test_cases]
                
                state["test_cases"] = test_cases
                
            except json.JSONDecodeError:
                # Store raw response for validator to repair
                state["test_cases"] = [{"raw_response": response}]
            
            return state
        
        except Exception as e:
            state["error_message"] = f"Test generator error: {str(e)}"
            return state
    
    async def _validator_node(self, state: WorkflowState) -> WorkflowState:
        """Validator/repair agent node"""
        run_id = state["run_id"]
        run_state = self.run_store.get_run(run_id)
        
        try:
            self.run_store.update_run(run_id,
                status=RunStatus.VALIDATING,
                current_node="validator",
                progress_percentage=70
            )
            
            test_cases = state["test_cases"]
            validation_issues = []
            
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
            
            # Validate each test case against schema
            validated_cases = []
            for i, case in enumerate(test_cases):
                try:
                    # Validate using Pydantic model
                    validated_case = TestCase(**case)
                    validated_cases.append(validated_case.dict())
                    
                except Exception as e:
                    validation_issues.append(f"Test case {i+1} validation failed: {str(e)}")
            
            state["test_cases"] = validated_cases
            state["validation_issues"] = validation_issues
            
            # Update run state
            self.run_store.update_run(run_id, 
                test_cases=validated_cases,
                validation_issues=validation_issues
            )
            
            return state
        
        except Exception as e:
            state["error_message"] = f"Validator error: {str(e)}"
            return state
    
    def _should_audit_coverage(self, state: WorkflowState) -> str:
        """Determine if coverage audit should be performed"""
        if not settings.COVERAGE_AUDITOR_ENABLED:
            return "format"
        
        # Check if we have validation issues that might indicate poor coverage
        if state.get("validation_issues"):
            return "audit"
        
        # Check if we have a reasonable number of test cases
        test_cases = state.get("test_cases", [])
        if len(test_cases) < 5:  # Arbitrary threshold
            return "audit"
        
        return "format"
    
    async def _coverage_auditor_node(self, state: WorkflowState) -> WorkflowState:
        """Coverage auditor agent node"""
        run_id = state["run_id"]
        run_state = self.run_store.get_run(run_id)
        
        try:
            self.run_store.update_run(run_id,
                status=RunStatus.AUDITING,
                current_node="coverage_auditor",
                progress_percentage=80
            )
            
            # Create LLM client
            llm_client = LLMClientFactory.create_client(
                provider=run_state.llm_provider,
                model=run_state.model
            )
            
            # Audit coverage
            messages = [
                {"role": "system", "content": PromptTemplates.get_coverage_auditor_system_prompt()},
                {"role": "user", "content": PromptTemplates.get_coverage_auditor_user_prompt(
                    state["features_summary"],
                    json.dumps(state["test_cases"], indent=2)
                )}
            ]
            
            response = await llm_client.generate_completion(messages)
            coverage_gaps = [line.strip() for line in response.split('\n') if line.strip()]
            
            state["coverage_gaps"] = coverage_gaps
            
            # Update run state
            self.run_store.update_run(run_id, coverage_gaps=coverage_gaps)
            
            return state
        
        except Exception as e:
            state["error_message"] = f"Coverage auditor error: {str(e)}"
            return state
    
    def _has_coverage_gaps(self, state: WorkflowState) -> str:
        """Determine if there are coverage gaps to address"""
        gaps = state.get("coverage_gaps", [])
        return "generate_gaps" if gaps else "format"
    
    async def _gap_generator_node(self, state: WorkflowState) -> WorkflowState:
        """Coverage gap generator agent node"""
        run_id = state["run_id"]
        run_state = self.run_store.get_run(run_id)
        
        try:
            self.run_store.update_run(run_id,
                status=RunStatus.GENERATING,
                current_node="gap_generator",
                progress_percentage=85
            )
            
            # Create LLM client
            llm_client = LLMClientFactory.create_client(
                provider=run_state.llm_provider,
                model=run_state.model
            )
            
            # Find highest TC ID
            existing_cases = state["test_cases"]
            highest_id = 0
            for case in existing_cases:
                if "id" in case:
                    match = re.search(r'TC-(\d+)', case["id"])
                    if match:
                        highest_id = max(highest_id, int(match.group(1)))
            
            # Generate additional test cases for gaps
            gaps_text = "\n".join(state["coverage_gaps"])
            messages = [
                {"role": "system", "content": PromptTemplates.get_gap_generator_system_prompt()},
                {"role": "user", "content": PromptTemplates.get_gap_generator_user_prompt(
                    gaps_text, highest_id
                )}
            ]
            
            response = await llm_client.generate_completion(messages)
            
            try:
                additional_cases = json.loads(response)
                if not isinstance(additional_cases, list):
                    additional_cases = [additional_cases]
                
                # Validate additional cases
                validated_additional = []
                for case in additional_cases:
                    try:
                        validated_case = TestCase(**case)
                        validated_additional.append(validated_case.dict())
                    except Exception as e:
                        # Skip invalid cases
                        continue
                
                state["additional_test_cases"] = validated_additional
                
                # Merge with existing test cases
                all_cases = state["test_cases"] + validated_additional
                state["test_cases"] = all_cases
                
                # Update run state
                self.run_store.update_run(run_id, test_cases=all_cases)
                
            except json.JSONDecodeError:
                # Skip if JSON is invalid
                pass
            
            return state
        
        except Exception as e:
            state["error_message"] = f"Gap generator error: {str(e)}"
            return state
    
    async def _formatter_node(self, state: WorkflowState) -> WorkflowState:
        """Formatter/exporter agent node"""
        run_id = state["run_id"]
        
        try:
            self.run_store.update_run(run_id,
                status=RunStatus.EXPORTING,
                current_node="formatter",
                progress_percentage=95
            )
            
            # Create artifacts directory
            import os
            artifacts_dir = f"artifacts/{run_id}"
            os.makedirs(artifacts_dir, exist_ok=True)
            
            # Export JSON
            json_path = f"{artifacts_dir}/testcases.json"
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(state["test_cases"], f, indent=2, ensure_ascii=False)
            
            # Export CSV
            csv_path = f"{artifacts_dir}/testcases.csv"
            self._export_to_csv(state["test_cases"], csv_path)
            
            # Create traceability matrix
            trace_path = f"{artifacts_dir}/traceability.json"
            self._create_traceability_matrix(state["test_cases"], trace_path)
            
            state["artifacts_path"] = artifacts_dir
            
            # Update run state
            self.run_store.update_run(run_id,
                status=RunStatus.COMPLETED,
                current_node="formatter",
                progress_percentage=100,
                completed_at=datetime.utcnow(),
                test_case_count=len(state["test_cases"]),
                artifacts_path=artifacts_dir
            )
            
            return state
        
        except Exception as e:
            state["error_message"] = f"Formatter error: {str(e)}"
            return state
    
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
    
    async def run_workflow(self, run_id: str) -> Dict[str, Any]:
        """Execute the workflow for a given run"""
        run_state = self.run_store.get_run(run_id)
        if not run_state:
            raise ValueError(f"Run {run_id} not found")
        
        # Initialize workflow state
        initial_state = WorkflowState(
            run_id=run_id,
            raw_text=run_state.raw_text or "",
            chunks=run_state.chunks or [],
            features_summary="",
            test_cases=[],
            validation_issues=[],
            coverage_gaps=[],
            additional_test_cases=[],
            artifacts_path="",
            error_message=None
        )
        
        try:
            # Run the workflow
            final_state = await self.graph.ainvoke(initial_state)
            
            return {
                "status": "completed",
                "test_case_count": len(final_state.get("test_cases", [])),
                "validation_issues": final_state.get("validation_issues", []),
                "coverage_gaps": final_state.get("coverage_gaps", []),
                "artifacts_path": final_state.get("artifacts_path", ""),
                "error_message": final_state.get("error_message")
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

