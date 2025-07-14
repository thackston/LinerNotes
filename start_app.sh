#!/bin/bash

echo "🚀 Starting Liner Notes Discovery App..."
echo ""

# Check if Redis is running
echo "🔍 Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis not running. Starting Redis..."
    if command -v brew &> /dev/null; then
        brew services start redis
    else
        echo "❌ Please install and start Redis manually"
        echo "   brew install redis && brew services start redis"
        exit 1
    fi
else
    echo "✅ Redis is running"
fi

# Navigate to backend and build
echo ""
echo "📦 Building backend..."
cd /Users/mattthackston/LinerNotes/backend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi

echo "✅ Backend built successfully"
echo ""

# Start backend in background
echo "🔧 Starting backend server..."
npm start &
BACKEND_PID=$!

# Give backend time to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd /Users/mattthackston/LinerNotes/frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "🌟 App starting up!"
echo "📍 Backend:  http://localhost:3001"
echo "📍 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
trap 'echo ""; echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID; exit 0' INT

# Keep script running
wait