"""
In-memory store for run state management
"""

import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum


class RunStatus(str, Enum):
    """Run status enumeration"""
    PENDING = "pending"
    UPLOADING = "uploading"
    READING = "reading"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    VALIDATING = "validating"
    AUDITING = "auditing"
    EXPORTING = "exporting"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class RunState:
    """State for a single run"""
    run_id: str
    status: RunStatus = RunStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    # File information
    filename: Optional[str] = None
    file_size: Optional[int] = None
    
    # Configuration
    llm_provider: str = "openai"
    model: str = "gpt-4"
    max_cases: int = 50
    repair_attempts: int = 1
    
    # Processing state
    current_node: Optional[str] = None
    progress_percentage: int = 0
    
    # Results
    raw_text: Optional[str] = None
    chunks: List[str] = field(default_factory=list)
    features_summary: Optional[str] = None
    test_cases: List[Dict[str, Any]] = field(default_factory=list)
    validation_issues: List[str] = field(default_factory=list)
    coverage_gaps: List[str] = field(default_factory=list)
    
    # Artifacts
    artifacts_path: Optional[str] = None
    
    # Error handling
    error_message: Optional[str] = None
    retry_count: int = 0


class RunStore:
    """In-memory store for managing run states"""
    
    def __init__(self):
        self._runs: Dict[str, RunState] = {}
    
    def create_run(self, filename: str, **kwargs) -> str:
        """Create a new run and return its ID"""
        run_id = str(uuid.uuid4())
        run_state = RunState(
            run_id=run_id,
            filename=filename,
            **kwargs
        )
        self._runs[run_id] = run_state
        return run_id
    
    def get_run(self, run_id: str) -> Optional[RunState]:
        """Get run state by ID"""
        return self._runs.get(run_id)
    
    def update_run(self, run_id: str, **updates) -> bool:
        """Update run state"""
        if run_id not in self._runs:
            return False
        
        run_state = self._runs[run_id]
        for key, value in updates.items():
            if hasattr(run_state, key):
                setattr(run_state, key, value)
        
        run_state.updated_at = datetime.utcnow()
        return True
    
    def list_runs(self, limit: int = 50) -> List[RunState]:
        """List recent runs"""
        runs = list(self._runs.values())
        runs.sort(key=lambda x: x.created_at, reverse=True)
        return runs[:limit]
    
    def delete_run(self, run_id: str) -> bool:
        """Delete a run"""
        if run_id in self._runs:
            del self._runs[run_id]
            return True
        return False

