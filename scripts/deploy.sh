#!/bin/bash

# Production deployment script

set -e

ENV=${1:-production}
VERSION=${2:-$(git rev-parse --short HEAD)}

echo "🚀 Deploying Markdown to Podcast v$VERSION to $ENV..."

# Build production image
echo "🔨 Building production image..."
docker build -f Dockerfile -t markdown-to-podcast:$VERSION .

# Tag as latest
docker tag markdown-to-podcast:$VERSION markdown-to-podcast:latest

# Optional: Push to container registry
if [ "$PUSH_REGISTRY" = "true" ]; then
  echo "📤 Pushing to container registry..."
  docker tag markdown-to-podcast:$VERSION $REGISTRY_URL/markdown-to-podcast:$VERSION
  docker tag markdown-to-podcast:latest $REGISTRY_URL/markdown-to-podcast:latest
  docker push $REGISTRY_URL/markdown-to-podcast:$VERSION
  docker push $REGISTRY_URL/markdown-to-podcast:latest
fi

# Deploy with docker-compose
echo "🐳 Deploying with Docker Compose..."
export IMAGE_TAG=$VERSION
docker-compose -f docker-compose.yml up -d

echo "✅ Deployment completed successfully!"
echo "🌐 Application should be available at: https://$DOMAIN"

# Wait for health check
echo "⏳ Waiting for application to be healthy..."
timeout 60 bash -c 'until curl -f http://localhost:3000/health; do sleep 2; done'
echo "✅ Application is healthy!"