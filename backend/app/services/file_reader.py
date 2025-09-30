"""
File reading service for various document formats
"""

import os
import io
from typing import List, Optional, Tuple
from pathlib import Path

import fitz  # PyMuPDF
from docx import Document
import aiofiles


class FileReader:
    """Service for reading various document formats"""
    
    SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.txt'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    @classmethod
    def is_supported(cls, filename: str) -> bool:
        """Check if file format is supported"""
        ext = Path(filename).suffix.lower()
        return ext in cls.SUPPORTED_EXTENSIONS
    
    @classmethod
    async def read_file(cls, file_path: str, filename: str) -> Tuple[str, int]:
        """
        Read file content and return text with file size
        
        Args:
            file_path: Path to the uploaded file
            filename: Original filename
            
        Returns:
            Tuple of (text_content, file_size_bytes)
        """
        if not cls.is_supported(filename):
            raise ValueError(f"Unsupported file format: {filename}")
        
        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size > cls.MAX_FILE_SIZE:
            raise ValueError(f"File too large: {file_size} bytes (max: {cls.MAX_FILE_SIZE})")
        
        ext = Path(filename).suffix.lower()
        
        if ext == '.pdf':
            text = await cls._read_pdf(file_path)
        elif ext == '.docx':
            text = await cls._read_docx(file_path)
        elif ext == '.txt':
            text = await cls._read_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")
        
        return text.strip(), file_size
    
    @classmethod
    async def _read_pdf(cls, file_path: str) -> str:
        """Read PDF file content"""
        try:
            doc = fitz.open(file_path)
            text_parts = []
            
            for page_num in range(doc.page_count):
                page = doc[page_num]
                text = page.get_text()
                if text.strip():
                    text_parts.append(text)
            
            doc.close()
            return '\n\n'.join(text_parts)
        
        except Exception as e:
            raise ValueError(f"Failed to read PDF: {str(e)}")
    
    @classmethod
    async def _read_docx(cls, file_path: str) -> str:
        """Read Word document content"""
        try:
            doc = Document(file_path)
            text_parts = []
            
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)
            
            return '\n\n'.join(text_parts)
        
        except Exception as e:
            raise ValueError(f"Failed to read Word document: {str(e)}")
    
    @classmethod
    async def _read_txt(cls, file_path: str) -> str:
        """Read plain text file content"""
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
            return content
        
        except UnicodeDecodeError:
            # Try with different encoding
            try:
                async with aiofiles.open(file_path, 'r', encoding='latin-1') as f:
                    content = await f.read()
                return content
            except Exception as e:
                raise ValueError(f"Failed to read text file: {str(e)}")
        
        except Exception as e:
            raise ValueError(f"Failed to read text file: {str(e)}")


class TextChunker:
    """Service for chunking text into manageable pieces"""
    
    def __init__(self, chunk_size: int = 8000, overlap: int = 200):
        self.chunk_size = chunk_size
        self.overlap = overlap
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Input text to chunk
            
        Returns:
            List of text chunks
        """
        if len(text) <= self.chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + self.chunk_size
            
            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence endings within the last 200 characters
                search_start = max(start + self.chunk_size - 200, start)
                sentence_end = text.rfind('.', search_start, end)
                if sentence_end > search_start:
                    end = sentence_end + 1
                else:
                    # Look for paragraph breaks
                    para_end = text.rfind('\n\n', search_start, end)
                    if para_end > search_start:
                        end = para_end + 2
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position with overlap
            start = max(start + 1, end - self.overlap)
        
        return chunks
    
    def extract_requirement_ids(self, text: str) -> List[str]:
        """
        Extract requirement IDs from text using common patterns
        
        Args:
            text: Input text
            
        Returns:
            List of found requirement IDs
        """
        import re
        
        # Common requirement ID patterns
        patterns = [
            r'REQ-\d+',
            r'REQ_\d+',
            r'REQUIREMENT\s+\d+',
            r'R-\d+',
            r'FR-\d+',  # Functional Requirement
            r'NFR-\d+',  # Non-Functional Requirement
        ]
        
        requirement_ids = set()
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            requirement_ids.update(matches)
        
        return sorted(list(requirement_ids))

