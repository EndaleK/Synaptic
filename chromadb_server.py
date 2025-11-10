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
