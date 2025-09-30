"""
LLM client abstraction for different providers
"""

import json
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import openai
from openai import AsyncOpenAI

from app.core.config import settings


class LLMClient(ABC):
    """Abstract base class for LLM clients"""
    
    @abstractmethod
    async def generate_completion(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Generate completion from messages"""
        pass


class OpenAIClient(LLMClient):
    """OpenAI client implementation"""
    
    def __init__(self, api_key: str, model: str = None):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model or settings.default_model
    
    async def generate_completion(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.1,
        max_tokens: int = 4000,
        **kwargs
    ) -> str:
        """Generate completion using OpenAI API"""
        try:
            print(f"DEBUG: Using model: {self.model}")
            print(f"DEBUG: OpenAI version: {openai.__version__}")
            print(f"DEBUG: API key set: {bool(self.client.api_key)}")
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            print(f"DEBUG: Exception in LLM client: {e}")
            raise RuntimeError(f"OpenAI API error: {str(e)}")


class LLMClientFactory:
    """Factory for creating LLM clients"""
    
    @staticmethod
    def create_client(provider: str = "openai", model: str = None, **kwargs) -> LLMClient:
        """Create LLM client based on provider"""
        if provider.lower() == "openai":
            api_key = kwargs.get("api_key", settings.openai_api_key)
            model = model or settings.default_model
            return OpenAIClient(api_key=api_key, model=model)
        
        raise ValueError(f"Unsupported LLM provider: {provider}")


class PromptTemplates:
    """Templates for agent prompts"""
    
    @staticmethod
    def get_analyzer_system_prompt() -> str:
        """System prompt for feature analyzer agent"""
        return """You are a senior QA analyst. From requirement text, extract actionable modules, user roles, inputs/outputs, constraints, and edge cases. Be concise but structured for test design. Prefer bullet lists grouped by feature.

Focus on:
- Identifying distinct functional modules/features
- Listing user roles and actors
- Documenting main user flows and processes
- Highlighting edge cases and constraints
- Extracting any explicit requirement IDs

Format your response as structured text with clear sections."""

    @staticmethod
    def get_analyzer_user_prompt(chunk: str) -> str:
        """User prompt for feature analyzer agent"""
        return f"""Analyze the following chunk and list:

**Modules/Features:**
- [List distinct functional areas]

**Actors:**
- [List user roles and system actors]

**Main Flows:**
- [List primary user workflows]

**Edge Cases:**
- [List boundary conditions and edge cases]

**Constraints:**
- [List business rules and limitations]

**Requirement IDs:**
- [List any explicit requirement identifiers found]

Text:
{chunk}"""

    @staticmethod
    def get_generator_system_prompt() -> str:
        """System prompt for test case generator agent"""
        return """You are a QA test designer. Generate thorough but deduplicated test cases. Output JSON ONLY as a list of objects matching the schema fields: id, title, requirement_ids[], preconditions[], steps[], expected_result, priority(High|Medium|Low), type(Functional|Negative|Edge|Security|Performance). Keep steps actionable and clear.

Requirements:
- Use IDs like TC-001, TC-002, etc.
- Ensure traceability to requirement IDs when present
- Cover positive, negative, edge, and security scenarios
- Make steps specific and actionable
- Avoid duplicate test cases"""

    @staticmethod
    def get_generator_user_prompt(features_summary: str, max_cases: int = 50) -> str:
        """User prompt for test case generator agent"""
        return f"""Create {max_cases} test cases from this feature summary, covering positive, negative, edge, and basic security cases where applicable. Use IDs like TC-001..N. Ensure traceability to requirement IDs when present.

Feature summary:
{features_summary}

Return ONLY valid JSON array of test case objects."""

    @staticmethod
    def get_validator_system_prompt() -> str:
        """System prompt for validator/repair agent"""
        return """You strictly repair invalid JSON to match the required fields. Return JSON only. No prose or markdown.

Required schema fields:
- id: string (format: TC-XXX)
- title: string
- requirement_ids: array of strings
- preconditions: array of strings
- steps: array of strings (non-empty)
- expected_result: string
- priority: "High" | "Medium" | "Low"
- type: "Functional" | "Negative" | "Edge" | "Security" | "Performance"

Return ONLY the corrected JSON array."""

    @staticmethod
    def get_validator_user_prompt(bad_json: str) -> str:
        """User prompt for validator/repair agent"""
        return f"""Schema fields: id, title, requirement_ids(list), preconditions(list), steps(list), expected_result, priority(High|Medium|Low), type.
Repair the following into a valid JSON array of objects matching the schema:
{bad_json}"""

    @staticmethod
    def get_coverage_auditor_system_prompt() -> str:
        """System prompt for coverage auditor agent"""
        return """You evaluate test coverage. Identify which modules/flows from the features summary are not adequately covered by the test case set. Output a concise list of gaps.

Focus on:
- Missing functional areas
- Uncovered user flows
- Missing edge cases
- Uncovered security scenarios
- Uncovered negative test scenarios

Format as a simple list of coverage gaps."""

    @staticmethod
    def get_coverage_auditor_user_prompt(features_summary: str, test_cases_json: str) -> str:
        """User prompt for coverage auditor agent"""
        return f"""Given:

Features summary:
{features_summary}

Current test cases (JSON):
{test_cases_json}

List missing or under-covered flows concisely."""

    @staticmethod
    def get_gap_generator_system_prompt() -> str:
        """System prompt for coverage gap generator agent"""
        return """You generate only the missing test cases to cover the identified gaps. Output JSON ONLY following the schema.

Requirements:
- Use new IDs continuing from the highest existing TC number
- Focus only on the identified gaps
- Follow the same schema as other test cases
- Return ONLY valid JSON array"""

    @staticmethod
    def get_gap_generator_user_prompt(gaps: str, highest_tc_id: int) -> str:
        """User prompt for coverage gap generator agent"""
        return f"""Create additional test cases only for the following gaps:
{gaps}

Use new IDs starting from TC-{highest_tc_id + 1:03d}.
Return a JSON array. Use new IDs continuing from the highest existing TC number."""
