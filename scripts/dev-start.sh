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

# Check if ElevenLabs API key is set
ELEVENLABS_KEY=$(grep ELEVENLABS_API_KEY .env | cut -d'=' -f2)
if [ -z "$ELEVENLABS_KEY" ] || [ "$ELEVENLABS_KEY" = "your-elevenlabs-api-key-here" ]; then
  echo "⚠️  ElevenLabs API key not configured"
  echo "Please get your API key from https://elevenlabs.io/app/settings/api-keys"
  echo "and update ELEVENLABS_API_KEY in .env"
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
