"""
Configuration management for the application
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # API Keys
    openai_api_key: str
    
    # Feature flags
    coverage_auditor_enabled: bool = True
    allow_multiple_files: bool = True
    
    # File handling
    max_file_size_mb: int = 10
    
    # Database
    database_url: str = "sqlite:///./testcase_generator.db"
    
    # LLM Configuration
    default_llm_provider: str = "openai"
    default_model: str = "gpt-4o-mini-2024-07-18"
    max_tokens: int = 4000
    temperature: float = 0.1
    
    # Chunking
    chunk_size: int = 8000
    chunk_overlap: int = 200
    
    # Test case generation
    max_test_cases: int = 50
    repair_attempts: int = 1
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()