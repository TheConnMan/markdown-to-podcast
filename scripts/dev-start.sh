#!/bin/bash

# Development startup script

set -e

echo "🚀 Starting Markdown to Podcast development environment..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env from template..."
  cp .env.example .env
  echo "⚠️  Please edit .env with your configuration before continuing"
  exit 1
fi

# Check if Google Cloud credentials exist
GOOGLE_CREDS=$(grep GOOGLE_APPLICATION_CREDENTIALS .env | cut -d'=' -f2)
if [ ! -f "$GOOGLE_CREDS" ]; then
  echo "⚠️  Google Cloud credentials file not found: $GOOGLE_CREDS"
  echo "Please download your service account key and update .env"
  exit 1
fi

# Create data directory
mkdir -p data/audio

# Start development environment
echo "🐳 Starting Docker development environment..."
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Development environment started!"
echo "🌐 Application: http://localhost:3000"
echo "📊 Health check: http://localhost:3000/health"