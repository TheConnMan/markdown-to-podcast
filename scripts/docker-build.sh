#!/bin/bash

# Docker build script for different environments

set -e

ENV=${1:-development}
VERSION=${2:-latest}

echo "Building Docker image for environment: $ENV"

case $ENV in
  "development")
    echo "Building development image..."
    docker build -f Dockerfile.dev -t markdown-to-podcast:dev-$VERSION .
    ;;
  "production")
    echo "Building production image..."
    docker build -f Dockerfile -t markdown-to-podcast:$VERSION .
    ;;
  *)
    echo "Unknown environment: $ENV"
    echo "Usage: $0 [development|production] [version]"
    exit 1
    ;;
esac

echo "Build completed successfully!"
echo "Image: markdown-to-podcast:${ENV}-${VERSION}"

# Optional: Run container validation
echo "Running container validation..."
docker run --rm --name test-container -p 3001:3000 \
  -e NODE_ENV=$ENV \
  -e API_KEY=test-key \
  -e PODCAST_UUID=test-uuid \
  markdown-to-podcast:${ENV}-${VERSION} &

CONTAINER_PID=$!
sleep 10

# Test health check
if curl -f http://localhost:3001/health; then
  echo "✅ Container health check passed"
else
  echo "❌ Container health check failed"
  exit 1
fi

# Clean up
docker stop test-container
wait $CONTAINER_PID

echo "✅ Container validation completed successfully"