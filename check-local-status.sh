#!/bin/bash

echo "🔍 Checking local development environment status..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check containers
echo "📦 Container Status:"
docker-compose ps

echo ""
echo "🌐 Service URLs:"
echo "  Frontend: http://localhost:8080"
echo "  Backend:  http://localhost:3000"
echo "  Database: localhost:5432"
echo ""

# Check backend health
echo "🏥 Health Checks:"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "  ✅ Backend is healthy"
    curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health
else
    echo "  ⏳ Backend is starting or not ready yet..."
fi

echo ""

# Check frontend
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "  ✅ Frontend is accessible"
else
    echo "  ⏳ Frontend is starting or not ready yet..."
fi

echo ""
echo "📋 To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "🛑 To stop all services:"
echo "  docker-compose down"
