# 🧪 Multi-Agent Test Case Generator

> **Transform your requirement documents into comprehensive test cases using AI-powered agents**

A production-ready system that automatically generates structured test cases from requirement documents (PDF, Word, plain text) using a sophisticated multi-agent workflow. Perfect for QA teams, developers, and test engineers who want to streamline their test case creation process.

![Test Case Generator](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ What Makes This Special?

- 🤖 **Multi-Agent AI Workflow**: 6 specialized agents work together to analyze, generate, validate, and export test cases
- 📄 **Multi-Format Support**: Handles PDF, Word (.docx), and plain text files seamlessly
- 🎯 **Comprehensive Coverage**: Generates positive, negative, edge, and security test cases
- ✅ **Smart Validation**: JSON schema validation with automatic repair capabilities
- 📊 **Rich Exports**: JSON and CSV formats with full traceability mapping
- 🎨 **Beautiful UI**: Modern, responsive interface with dark mode support
- ⚡ **Real-time Progress**: Live status updates and progress tracking

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** (tested with 3.8, 3.9, 3.10, 3.11)
- **Node.js 18+** 
- **OpenAI API Key** (for GPT-4o-mini or GPT-4o)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/test-case-generator.git
cd test-case-generator
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Create environment file
cp env.local.example .e