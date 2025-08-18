#!/bin/bash

# AI Model Trainer Startup Script

echo "🚀 Starting AI Model Trainer..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.template to .env and configure it."
    exit 1
fi

# Check if Python dependencies are installed
echo "📦 Checking Python dependencies..."
if ! pip list | grep -q fastapi; then
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Check if Node.js dependencies are installed
echo "📦 Checking Node.js dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    cd frontend && npm install && cd ..
fi

# Check if concurrently is installed globally
if ! command -v concurrently &> /dev/null; then
    echo "📦 Installing concurrently globally..."
    npm install -g concurrently
fi

echo "✅ All dependencies are ready!"

# Start the application
echo "🌟 Starting both backend and frontend..."
echo "🔗 Frontend will be available at: http://localhost:3000"
echo "🔗 Backend API will be available at: http://localhost:8000"
echo "📚 API Documentation will be available at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the application"

npm run dev
