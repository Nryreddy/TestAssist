"""
Pydantic models for API schemas
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum


class Priority(str, Enum):
    """Test case priority levels"""
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class TestCaseType(str, Enum):
    """Test case types"""
    FUNCTIONAL = "Functional"
    NEGATIVE = "Negative"
    EDGE = "Edge"
    SECURITY = "Security"
    PERFORMANCE = "Performance"


class TestCase(BaseModel):
    """Test case model with strict validation"""
    id: str = Field(..., description="Unique test case identifier (e.g., TC-001)")
    title: str = Field(..., min_length=1, description="Test case title")
    requirement_ids: List[str] = Field(default_factory=list, description="Related requirement IDs")
    preconditions: List[str] = Field(default_factory=list, description="Test preconditions")
    steps: List[str] = Field(..., min_items=1, description="Test execution steps")
    expected_result: str = Field(..., min_length=1, description="Expected test result")
    priority: Priority = Field(..., description="Test case priority")
    type: TestCaseType = Field(..., description="Test case type")
    
    @validator('id')
    def validate_id(cls, v):
        """Validate test case ID format"""
        if not v.startswith('TC-'):
            raise ValueError('Test case ID must start with "TC-"')
        return v
    
    @validator('steps')
    def validate_steps(cls, v):
        """Ensure steps are non-empty strings"""
        if not all(step.strip() for step in v):
            raise ValueError('All test steps must be non-empty')
        return v


class IngestRequest(BaseModel):
    """Request model for document ingestion"""
    llm_provider: str = Field(default="openai", description="LLM provider")
    model: str = Field(default="gpt-4", description="Model name")
    max_cases: int = Field(default=50, ge=10, le=100, description="Maximum test cases to generate")
    repair_attempts: int = Field(default=1, ge=0, le=3, description="JSON repair attempts")
    enable_coverage_auditor: bool = Field(default=True, description="Enable coverage auditing")


class IngestResponse(BaseModel):
    """Response model for document ingestion"""
    run_id: str = Field(..., description="Unique run identifier")
    message: str = Field(..., description="Status message")


class RunStatus(BaseModel):
    """Run status information"""
    run_id: str
    status: str
    current_node: Optional[str] = None
    progress_percentage: int = Field(ge=0, le=100)
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    test_case_count: int = 0
    error_message: Optional[str] = None
    filename: Optional[str] = None


class GenerateRequest(BaseModel):
    """Request model for triggering generation"""
    force_restart: bool = Field(default=False, description="Force restart from beginning")


class GenerateResponse(BaseModel):
    """Response model for generation trigger"""
    run_id: str
    status: str
    message: str


class RunHistory(BaseModel):
    """Run history entry"""
    run_id: str
    filename: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    test_case_count: int = 0
    llm_provider: Optional[str] = None
    model: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    detail: Optional[str] = None
    run_id: Optional[str] = None

