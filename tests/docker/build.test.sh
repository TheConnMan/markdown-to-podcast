#!/bin/bash

# Docker build tests

set -e

echo "🧪 Testing Docker builds..."

# Test development build
echo "Testing development build..."
docker build -f Dockerfile.dev -t test-dev .
docker run --rm --name test-dev-container -d -p 3001:3000 test-dev
sleep 10

if curl -f http://localhost:3001/health; then
  echo "✅ Development build test passed"
else
  echo "❌ Development build test failed"
  exit 1
fi

docker stop test-dev-container

# Test production build
echo "Testing production build..."
docker build -f Dockerfile -t test-prod .
docker run --rm --name test-prod-container -d -p 3002:3000 test-prod
sleep 10

if curl -f http://localhost:3002/health; then
  echo "✅ Production build test passed"
else
  echo "❌ Production build test failed"
  exit 1
fi

docker stop test-prod-container

# Clean up test images
docker rmi test-dev test-prod

echo "✅ All Docker build tests passed!"