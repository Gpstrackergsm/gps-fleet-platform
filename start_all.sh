#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Cleanup function
cleanup() {
    echo "Stopping services..."
    # Kill background jobs
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "🚀 Starting GPS SaaS Platform (Perfect Edition)..."

# 1. Database Check (Docker First)
DB_READY=false

if command_exists docker && docker info >/dev/null 2>&1; then
    if ! docker ps | grep -q "gps-db"; then
        echo "🐳 Starting MySQL via Docker..."
        # Remove old container if exists but stopped
        docker rm gps-db >/dev/null 2>&1
        
        # Run new container
        docker run --name gps-db \
            -e MYSQL_ROOT_PASSWORD= \
            -e MYSQL_ALLOW_EMPTY_PASSWORD=yes \
            -e MYSQL_DATABASE=gps_platform \
            -p 3306:3306 \
            -d mysql:8.0
        
        echo "⏳ Waiting for Database to be ready..."
        sleep 10
    else
        echo "✅ Database (Docker) is already running."
    fi
    DB_READY=true
else
    echo "⚠️  Docker is not running or not installed."
    echo "Checking if local PostgreSQL is running on port 5432..."
    if lsof -i :5432 >/dev/null; then
        echo "✅ Local PostgreSQL detected on port 5432."
        DB_READY=true
    elif lsof -i :3306 >/dev/null; then
        echo "✅ Local MySQL detected on port 3306."
        DB_READY=true
    else
        echo "❌ No Database detected!"
        echo "Please start Docker or a local MySQL/PostgreSQL instance manually."
        echo "The backend will likely fail to connect."
    fi
fi

# 2. Start Backend
echo "📦 Starting Backend..."
cd backend
npm install
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend running (PID: $BACKEND_PID)"

# 3. Start Frontend
echo "💻 Starting Frontend..."
cd ../frontend
npm install
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend running (PID: $FRONTEND_PID)"

echo "------------------------------------------------"
echo "✅ SYSTEM LAUNCHED"
echo "👉 Dashboard: http://localhost:3000"
echo "👉 API:       http://localhost:4000"
echo "------------------------------------------------"
if [ "$DB_READY" = false ]; then
    echo "⚠️  WARNING: Database was not started automatically."
    echo "   Ensure you have PostgreSQL running on localhost:5432."
fi
echo "Press Ctrl+C to stop all services."

# Keep script running to maintain background jobs
echo ""
echo "📱 To start the Mobile App:"
echo "   cd mobile && npx expo start"
echo ""
wait
