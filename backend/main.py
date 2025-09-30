"""
Multi-Agent Test Case Generator - FastAPI Application
"""

import os
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import settings
from app.core.database import init_db
from app.core.store import RunStore


# Global run store for development
run_store = RunStore()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="Multi-Agent Test Case Generator",
    description="Generate comprehensive test cases from requirement documents",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api/v1")

# Serve static files for artifacts
app.mount("/artifacts", StaticFiles(directory="artifacts"), name="artifacts")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Multi-Agent Test Case Generator API", "status": "healthy"}


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "features": {
            "coverage_auditor": settings.coverage_auditor_enabled,
            "multiple_files": settings.allow_multiple_files,
            "max_file_size_mb": settings.max_file_size_mb
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
