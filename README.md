# Markdown to Podcast

A TypeScript web application that converts markdown content into podcast episodes using ElevenLabs Text-to-Speech and serves them via RSS feed.

## Features

- **Content Input**: Paste markdown content or import from URLs
- **Audio Generation**: Convert text to MP3 using ElevenLabs TTS
- **RSS Feed**: Generate podcast feed for consumption in podcast apps
- **PWA Support**: Progressive Web App with share target functionality
- **Storage Management**: Automatic episode cleanup (25 episode limit)
- **Docker Ready**: Containerized deployment with FFmpeg

## Quick Start

### Prerequisites

- Docker and Docker Compose
- ElevenLabs API key (get one at https://elevenlabs.io)

### Setup

1. Clone the repository
2. Get your ElevenLabs API key from https://elevenlabs.io/app/settings/api-keys
3. Set up environment variables:

```bash
# .env
ELEVENLABS_API_KEY="your-elevenlabs-api-key"
API_KEY="your-secret-key"
PODCAST_UUID="your-uuid-for-rss-feed"
PORT=3000
```

4. Start development environment:

```bash
docker-compose -f docker-compose.dev.yml up
```

5. Access at `http://localhost:3000`

### Production Deployment

```bash
docker-compose up -d
```

## API Endpoints

- `POST /api/generate` - Convert markdown to podcast episode
- `POST /share` - Handle PWA share target
- `GET /podcast/{uuid}` - RSS feed
- `GET /audio/{filename}` - Serve audio files

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run test         # Run tests
npm run lint         # Run linter
npm run format       # Format code
```

### Testing

Run the complete test suite:

```bash
npm test
```

Test with coverage:

```bash
npm run test:coverage
```

### Architecture

- **Backend**: Express.js with TypeScript
- **Audio Processing**: ElevenLabs TTS + FFmpeg
- **Frontend**: Static HTML with vanilla JavaScript
- **Storage**: JSON metadata + filesystem audio storage
- **RSS**: Standards-compliant podcast feed

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Yes |
| `API_KEY` | Authentication key for API access | Yes |
| `PODCAST_UUID` | UUID for RSS feed URL obfuscation | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |

### ElevenLabs Setup

1. Create an account at https://elevenlabs.io
2. Go to Settings > API Keys
3. Generate an API key
4. Add to your `.env` file as `ELEVENLABS_API_KEY`

## Docker

### Development

```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      dockerfile: Dockerfile.dev
    volumes:
      - ./src:/app/src
      - ./data:/app/data
```

### Production

```yaml
# docker-compose.yml
services:
  app:
    build: .
    restart: unless-stopped
```
