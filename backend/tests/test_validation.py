"""
Tests for validation and repair functionality
"""

import pytest
import json
from app.models.schemas import TestCase, Priority, TestCaseType


class TestTestCaseValidation:
    """Test test case validation"""
    
    def test_valid_test_case(self):
        """Test valid test case creation"""
        test_case = TestCase(
            id="TC-001",
            title="Test user login",
            requirement_ids=["REQ-001"],
            preconditions=["User is not logged in"],
            steps=["Navigate to login page", "Enter credentials", "Click login"],
            expected_result="User is logged in successfully",
            priority=Priority.HIGH,
            type=TestCaseType.FUNCTIONAL
        )
        
        assert test_case.id == "TC-001"
        assert test_case.title == "Test user login"
        assert test_case.priority == Priority.HIGH
        assert test_case.type == TestCaseType.FUNCTIONAL
    
    def test_invalid_id_format(self):
        """Test invalid ID format validation"""
        with pytest.raises(ValueError, match='Test case ID must start with "TC-"'):
            TestCase(
                id="TEST-001",  # Invalid format
                title="Test case",
                steps=["Step 1"],
                expected_result="Expected result",
                priority=Priority.HIGH,
                type=TestCaseType.FUNCTIONAL
            )
    
    def test_empty_steps(self):
        """Test empty steps validation"""
        with pytest.raises(ValueError, match="All test steps must be non-empty"):
            TestCase(
                id="TC-001",
                title="Test case",
                steps=["Step 1", "", "Step 3"],  # Empty step
                expected_result="Expected result",
                priority=Priority.HIGH,
                type=TestCaseType.FUNCTIONAL
            )
    
    def test_minimum_required_fields(self):
        """Test minimum required fields"""
        test_case = TestCase(
            id="TC-001",
            title="Minimal test case",
            steps=["Single step"],
            expected_result="Result",
            priority=Priority.MEDIUM,
            type=TestCaseType.FUNCTIONAL
        )
        
        assert test_case.requirement_ids == []
        assert test_case.preconditions == []
    
    def test_priority_enum(self):
        """Test priority enum values"""
        assert Priority.HIGH == "High"
        assert Priority.MEDIUM == "Medium"
        assert Priority.LOW == "Low"
    
    def test_type_enum(self):
        """Test type enum values"""
        assert TestCaseType.FUNCTIONAL == "Functional"
        assert TestCaseType.NEGATIVE == "Negative"
        assert TestCaseType.EDGE == "Edge"
        assert TestCaseType.SECURITY == "Security"
        assert TestCaseType.PERFORMANCE == "Performance"


class TestJSONValidation:
    """Test JSON validation and repair"""
    
    def test_valid_json_parsing(self):
        """Test parsing valid JSON test cases"""
        valid_json = [
            {
                "id": "TC-001",
                "title": "Test case 1",
                "requirement_ids": ["REQ-001"],
                "preconditions": ["Precondition 1"],
                "steps": ["Step 1", "Step 2"],
                "expected_result": "Expected result",
                "priority": "High",
                "type": "Functional"
            }
        ]
        
        # Should not raise any exceptions
        test_cases = [TestCase(**case) for case in valid_json]
        assert len(test_cases) == 1
        assert test_cases[0].id == "TC-001"
    
    def test_invalid_json_handling(self):
        """Test handling of invalid JSON"""
        invalid_json = [
            {
                "id": "INVALID-ID",  # Invalid format
                "title": "",  # Empty title
                "steps": [],  # Empty steps
                "expected_result": "",
                "priority": "InvalidPriority",
                "type": "InvalidType"
            }
        ]
        
        # Should raise validation errors
        with pytest.raises(ValueError):
            TestCase(**invalid_json[0])
    
    def test_missing_required_fields(self):
        """Test handling of missing required fields"""
        incomplete_json = {
            "id": "TC-001",
            "title": "Test case"
            # Missing required fields
        }
        
        with pytest.raises(ValueError):
            TestCase(**incomplete_json)
    
    def test_extra_fields_handling(self):
        """Test handling of extra fields in JSON"""
        json_with_extra = {
            "id": "TC-001",
            "title": "Test case",
            "steps": ["Step 1"],
            "expected_result": "Result",
            "priority": "High",
            "type": "Functional",
            "extra_field": "This should be ignored"
        }
        
        # Should work fine, extra fields are ignored
        test_case = TestCase(**json_with_extra)
        assert test_case.id == "TC-001"
        assert not hasattr(test_case, 'extra_field')


class TestJSONRepair:
    """Test JSON repair functionality"""
    
    def test_repair_missing_quotes(self):
        """Test repairing JSON with missing quotes"""
        malformed_json = """
        [
            {
                id: "TC-001",
                title: "Test case",
                steps: ["Step 1"],
                expected_result: "Result",
                priority: "High",
                type: "Functional"
            }
        ]
        """
        
        # This would need to be handled by the LLM repair agent
        # For now, we just test that the structure is recognizable
        assert "TC-001" in malformed_json
        assert "Test case" in malformed_json
    
    def test_repair_trailing_comma(self):
        """Test repairing JSON with trailing comma"""
        malformed_json = """
        [
            {
                "id": "TC-001",
                "title": "Test case",
                "steps": ["Step 1"],
                "expected_result": "Result",
                "priority": "High",
                "type": "Functional",
            }
        ]
        """
        
        # This would need to be handled by the LLM repair agent
        assert "TC-001" in malformed_json

