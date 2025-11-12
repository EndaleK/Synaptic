#!/bin/bash
# Start ChromaDB using Python (no Docker required)
# Easier setup for local development

echo "🚀 Starting ChromaDB with Python..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python first."
    exit 1
fi

# Check if ChromaDB is installed
if ! python3 -c "import chromadb" 2>/dev/null; then
    echo "📦 Installing ChromaDB..."
    pip install chromadb
    echo ""
fi

# Create a simple ChromaDB server script
cat > chromadb_server.py << 'PYTHON_SCRIPT'
#!/usr/bin/env python3
"""
Simple ChromaDB server for Synaptic
Runs on http://localhost:8000
"""
import chromadb
from chromadb.config import Settings
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize ChromaDB
chroma_client = chromadb.Client(Settings(
    chroma_db_impl="duckdb+parquet",
    persist_directory="./chromadb_data"
))

print("✅ ChromaDB initialized")
print(f"📁 Data directory: ./chromadb_data")
print(f"🌐 Server: http://localhost:8000")

# Start the HTTP server
uvicorn.run(
    "chromadb.app:app",
    host="0.0.0.0",
    port=8000,
    log_level="info"
)
PYTHON_SCRIPT

chmod +x chromadb_server.py

# Check if ChromaDB is already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 8000 is already in use"
    echo "   Checking if it's ChromaDB..."
    if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
        echo "✅ ChromaDB is already running!"
        echo ""
        echo "📊 ChromaDB Info:"
        echo "   URL: http://localhost:8000"
        echo "   Status: Running"
        echo ""
        echo "💡 To stop: pkill -f 'chroma run'"
        exit 0
    else
        echo "❌ Another service is using port 8000"
        echo "   Stop it first: lsof -ti:8000 | xargs kill -9"
        exit 1
    fi
fi

# Start ChromaDB server
echo "🔧 Starting ChromaDB server..."
echo "   This will keep running in the background..."
echo ""

# Run in background with nohup
nohup python3 -m chromadb.cli.cli run --host 0.0.0.0 --port 8000 > chromadb.log 2>&1 &

# Wait a moment for it to start
sleep 3

# Test connection
echo "🔍 Testing connection..."
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo "✅ ChromaDB is running and accessible!"
    echo ""
    echo "📊 ChromaDB Info:"
    echo "   URL: http://localhost:8000"
    echo "   Log file: chromadb.log"
    echo "   Data directory: ./chromadb_data"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Run: npm run dev"
    echo "   2. Go to Documents page"
    echo "   3. Click 'Index Document' on large files"
    echo ""
    echo "💡 To stop ChromaDB: pkill -f 'chroma run'"
    echo "💡 To view logs: tail -f chromadb.log"
else
    echo "❌ ChromaDB failed to start"
    echo ""
    echo "Check logs:"
    echo "   cat chromadb.log"
    echo ""
    echo "Or try manually:"
    echo "   python3 -m chromadb.cli.cli run --host 0.0.0.0 --port 8000"
    exit 1
fi
