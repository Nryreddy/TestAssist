"""
Tests for file reading functionality
"""

import pytest
import tempfile
import os
from pathlib import Path

from app.services.file_reader import FileReader, TextChunker


class TestFileReader:
    """Test file reading functionality"""
    
    def test_is_supported(self):
        """Test file format support detection"""
        assert FileReader.is_supported("test.pdf")
        assert FileReader.is_supported("test.docx")
        assert FileReader.is_supported("test.txt")
        assert not FileReader.is_supported("test.doc")
        assert not FileReader.is_supported("test.xlsx")
        assert not FileReader.is_supported("test")
    
    def test_read_txt_file(self):
        """Test reading plain text files"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is a test document.\n\nIt has multiple paragraphs.")
            temp_path = f.name
        
        try:
            import asyncio
            text, size = asyncio.run(FileReader.read_file(temp_path, "test.txt"))
            assert "This is a test document" in text
            assert "multiple paragraphs" in text
            assert size > 0
        finally:
            os.unlink(temp_path)
    
    def test_file_size_limit(self):
        """Test file size limit enforcement"""
        # Create a large file (over 10MB)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            # Write 11MB of data
            large_content = "x" * (11 * 1024 * 1024)
            f.write(large_content)
            temp_path = f.name
        
        try:
            import asyncio
            with pytest.raises(ValueError, match="File too large"):
                asyncio.run(FileReader.read_file(temp_path, "large.txt"))
        finally:
            os.unlink(temp_path)
    
    def test_unsupported_format(self):
        """Test unsupported file format handling"""
        with tempfile.NamedTemporaryFile(suffix='.xyz', delete=False) as f:
            f.write(b"some content")
            temp_path = f.name
        
        try:
            import asyncio
            with pytest.raises(ValueError, match="Unsupported file format"):
                asyncio.run(FileReader.read_file(temp_path, "test.xyz"))
        finally:
            os.unlink(temp_path)


class TestTextChunker:
    """Test text chunking functionality"""
    
    def test_chunk_small_text(self):
        """Test chunking small text that doesn't need splitting"""
        chunker = TextChunker(chunk_size=1000, overlap=100)
        text = "This is a short text that doesn't need chunking."
        chunks = chunker.chunk_text(text)
        
        assert len(chunks) == 1
        assert chunks[0] == text
    
    def test_chunk_large_text(self):
        """Test chunking large text that needs splitting"""
        chunker = TextChunker(chunk_size=50, overlap=10)
        text = "This is a longer text that will be split into multiple chunks. " * 10
        chunks = chunker.chunk_text(text)
        
        assert len(chunks) > 1
        assert all(len(chunk) <= 50 for chunk in chunks)
    
    def test_chunk_overlap(self):
        """Test that chunks have proper overlap"""
        chunker = TextChunker(chunk_size=50, overlap=20)
        text = "A" * 100  # 100 character string
        chunks = chunker.chunk_text(text)
        
        assert len(chunks) > 1
        # Check that chunks overlap (simplified check)
        total_length = sum(len(chunk) for chunk in chunks)
        assert total_length > len(text)  # Should be longer due to overlap
    
    def test_extract_requirement_ids(self):
        """Test requirement ID extraction"""
        chunker = TextChunker()
        text = """
        REQ-001: User authentication
        REQ-002: Data validation
        FR-003: File upload
        NFR-004: Performance requirements
        Some other text without requirements
        """
        
        ids = chunker.extract_requirement_ids(text)
        
        assert "REQ-001" in ids
        assert "REQ-002" in ids
        assert "FR-003" in ids
        assert "NFR-004" in ids
        assert len(ids) == 4
    
    def test_extract_requirement_ids_case_insensitive(self):
        """Test requirement ID extraction is case insensitive"""
        chunker = TextChunker()
        text = "req-001: Lowercase requirement"
        
        ids = chunker.extract_requirement_ids(text)
        
        assert "req-001" in ids
    
    def test_extract_requirement_ids_no_matches(self):
        """Test requirement ID extraction with no matches"""
        chunker = TextChunker()
        text = "This text has no requirement IDs in it."
        
        ids = chunker.extract_requirement_ids(text)
        
        assert len(ids) == 0

