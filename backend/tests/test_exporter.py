"""
Tests for export functionality
"""

import pytest
import tempfile
import os
import json
import pandas as pd
from app.services.workflow import TestCaseWorkflow


class TestCSVExport:
    """Test CSV export functionality"""
    
    def test_export_to_csv(self):
        """Test exporting test cases to CSV"""
        test_cases = [
            {
                "id": "TC-001",
                "title": "Test user login",
                "requirement_ids": ["REQ-001", "REQ-002"],
                "preconditions": ["User is not logged in"],
                "steps": ["Navigate to login page", "Enter credentials"],
                "expected_result": "User is logged in",
                "priority": "High",
                "type": "Functional"
            },
            {
                "id": "TC-002",
                "title": "Test invalid login",
                "requirement_ids": ["REQ-003"],
                "preconditions": [],
                "steps": ["Enter invalid credentials"],
                "expected_result": "Login fails",
                "priority": "Medium",
                "type": "Negative"
            }
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            temp_path = f.name
        
        try:
            # Create workflow instance to access export method
            workflow = TestCaseWorkflow(None)
            workflow._export_to_csv(test_cases, temp_path)
            
            # Read and verify CSV
            df = pd.read_csv(temp_path)
            
            assert len(df) == 2
            assert df.iloc[0]['id'] == 'TC-001'
            assert df.iloc[0]['title'] == 'Test user login'
            assert df.iloc[0]['requirement_ids'] == 'REQ-001; REQ-002'
            assert df.iloc[0]['steps'] == 'Navigate to login page; Enter credentials'
            assert df.iloc[0]['priority'] == 'High'
            assert df.iloc[0]['type'] == 'Functional'
            
            assert df.iloc[1]['id'] == 'TC-002'
            assert df.iloc[1]['type'] == 'Negative'
            
        finally:
            os.unlink(temp_path)
    
    def test_export_empty_list(self):
        """Test exporting empty test case list"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            temp_path = f.name
        
        try:
            workflow = TestCaseWorkflow(None)
            workflow._export_to_csv([], temp_path)
            
            df = pd.read_csv(temp_path)
            assert len(df) == 0
            
        finally:
            os.unlink(temp_path)
    
    def test_export_with_special_characters(self):
        """Test exporting test cases with special characters"""
        test_cases = [
            {
                "id": "TC-001",
                "title": "Test with \"quotes\" and 'apostrophes'",
                "requirement_ids": ["REQ-001"],
                "preconditions": ["Precondition with; semicolon"],
                "steps": ["Step with, comma", "Step with\nnewline"],
                "expected_result": "Result with special chars: @#$%",
                "priority": "High",
                "type": "Functional"
            }
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            temp_path = f.name
        
        try:
            workflow = TestCaseWorkflow(None)
            workflow._export_to_csv(test_cases, temp_path)
            
            df = pd.read_csv(temp_path)
            assert len(df) == 1
            assert "quotes" in df.iloc[0]['title']
            assert "semicolon" in df.iloc[0]['preconditions']
            assert "comma" in df.iloc[0]['steps']
            
        finally:
            os.unlink(temp_path)


class TestJSONExport:
    """Test JSON export functionality"""
    
    def test_export_to_json(self):
        """Test exporting test cases to JSON"""
        test_cases = [
            {
                "id": "TC-001",
                "title": "Test user login",
                "requirement_ids": ["REQ-001"],
                "preconditions": ["User is not logged in"],
                "steps": ["Navigate to login page"],
                "expected_result": "User is logged in",
                "priority": "High",
                "type": "Functional"
            }
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name
        
        try:
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(test_cases, f, indent=2, ensure_ascii=False)
            
            # Read and verify JSON
            with open(temp_path, 'r', encoding='utf-8') as f:
                loaded_cases = json.load(f)
            
            assert len(loaded_cases) == 1
            assert loaded_cases[0]['id'] == 'TC-001'
            assert loaded_cases[0]['title'] == 'Test user login'
            
        finally:
            os.unlink(temp_path)
    
    def test_export_unicode_characters(self):
        """Test exporting test cases with unicode characters"""
        test_cases = [
            {
                "id": "TC-001",
                "title": "Test with unicode: 测试用例",
                "requirement_ids": ["REQ-001"],
                "preconditions": ["Précondition avec accents"],
                "steps": ["Step with émojis 🚀"],
                "expected_result": "Résultat avec caractères spéciaux",
                "priority": "High",
                "type": "Functional"
            }
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name
        
        try:
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(test_cases, f, indent=2, ensure_ascii=False)
            
            with open(temp_path, 'r', encoding='utf-8') as f:
                loaded_cases = json.load(f)
            
            assert len(loaded_cases) == 1
            assert "测试用例" in loaded_cases[0]['title']
            assert "émojis" in loaded_cases[0]['steps']
            
        finally:
            os.unlink(temp_path)


class TestTraceabilityMatrix:
    """Test traceability matrix creation"""
    
    def test_create_traceability_matrix(self):
        """Test creating traceability matrix"""
        test_cases = [
            {
                "id": "TC-001",
                "title": "Test user login",
                "requirement_ids": ["REQ-001", "REQ-002"],
                "priority": "High",
                "type": "Functional"
            },
            {
                "id": "TC-002",
                "title": "Test invalid login",
                "requirement_ids": ["REQ-001"],
                "priority": "Medium",
                "type": "Negative"
            },
            {
                "id": "TC-003",
                "title": "Test data validation",
                "requirement_ids": ["REQ-003"],
                "priority": "Low",
                "type": "Functional"
            }
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name
        
        try:
            workflow = TestCaseWorkflow(None)
            workflow._create_traceability_matrix(test_cases, temp_path)
            
            with open(temp_path, 'r', encoding='utf-8') as f:
                traceability = json.load(f)
            
            # Check that REQ-001 has 2 test cases
            assert "REQ-001" in traceability
            assert len(traceability["REQ-001"]) == 2
            assert traceability["REQ-001"][0]["test_case_id"] == "TC-001"
            assert traceability["REQ-001"][1]["test_case_id"] == "TC-002"
            
            # Check that REQ-002 has 1 test case
            assert "REQ-002" in traceability
            assert len(traceability["REQ-002"]) == 1
            assert traceability["REQ-002"][0]["test_case_id"] == "TC-001"
            
            # Check that REQ-003 has 1 test case
            assert "REQ-003" in traceability
            assert len(traceability["REQ-003"]) == 1
            assert traceability["REQ-003"][0]["test_case_id"] == "TC-003"
            
        finally:
            os.unlink(temp_path)
    
    def test_traceability_matrix_empty_requirements(self):
        """Test traceability matrix with test cases having no requirements"""
        test_cases = [
            {
                "id": "TC-001",
                "title": "Test without requirements",
                "requirement_ids": [],
                "priority": "High",
                "type": "Functional"
            }
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name
        
        try:
            workflow = TestCaseWorkflow(None)
            workflow._create_traceability_matrix(test_cases, temp_path)
            
            with open(temp_path, 'r', encoding='utf-8') as f:
                traceability = json.load(f)
            
            # Should be empty since no requirements
            assert len(traceability) == 0
            
        finally:
            os.unlink(temp_path)

