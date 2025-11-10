#!/bin/bash
# Start ChromaDB for RAG indexing
# Run this script before starting the development server

echo "🚀 Starting ChromaDB..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if ChromaDB container already exists
if docker ps -a | grep -q "chromadb-synaptic"; then
    echo "📦 ChromaDB container exists, starting it..."
    docker start chromadb-synaptic
else
    echo "📦 Creating and starting new ChromaDB container..."
    docker run -d \
        --name chromadb-synaptic \
        -p 8000:8000 \
        --restart unless-stopped \
        chromadb/chroma
fi

# Wait for ChromaDB to be ready
echo ""
echo "⏳ Waiting for ChromaDB to start..."
sleep 3

# Test connection
echo ""
echo "🔍 Testing connection..."
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null; then
    echo "✅ ChromaDB is running and accessible!"
    echo ""
    echo "📊 ChromaDB Info:"
    echo "   URL: http://localhost:8000"
    echo "   Container: chromadb-synaptic"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Run: npm run dev"
    echo "   2. Go to Documents page"
    echo "   3. Click 'Index Document' on large files"
    echo ""
    echo "💡 Tip: ChromaDB will restart automatically on system reboot"
else
    echo "❌ ChromaDB failed to start or is not accessible"
    echo ""
    echo "Troubleshooting:"
    echo "   - Check Docker logs: docker logs chromadb-synaptic"
    echo "   - Ensure port 8000 is not in use: lsof -i :8000"
    echo "   - Restart Docker and try again"
    exit 1
fi
