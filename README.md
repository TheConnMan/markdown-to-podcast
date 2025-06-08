# Markdown to Podcast

A TypeScript web application that converts markdown content into podcast episodes using Google Cloud Text-to-Speech API and serves them via RSS feed.

## Features

- **Content Input**: Paste markdown content or import from URLs
- **Audio Generation**: Convert text to MP3 using Google Cloud TTS
- **RSS Feed**: Generate podcast feed for consumption in podcast apps
- **PWA Support**: Progressive Web App with share target functionality
- **Storage Management**: Automatic episode cleanup (25 episode limit)
- **Docker Ready**: Containerized deployment with FFmpeg

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Google Cloud project with Text-to-Speech API enabled
- Service account with TTS permissions

### Setup

1. Clone the repository
2. Create Google Cloud service account and download JSON key
3. Set up environment variables:

```bash
# .env
GOOGLE_APPLICATION_CREDENTIALS="/app/google-credentials.json"
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
- **Audio Processing**: Google Cloud TTS + FFmpeg
- **Frontend**: Static HTML with vanilla JavaScript
- **Storage**: JSON metadata + filesystem audio storage
- **RSS**: Standards-compliant podcast feed

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google Cloud service account JSON | Yes |
| `API_KEY` | Authentication key for API access | Yes |
| `PODCAST_UUID` | UUID for RSS feed URL obfuscation | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |

### Google Cloud Setup

1. Create Google Cloud project
2. Enable Text-to-Speech API
3. Create service account with "Cloud Text-to-Speech User" role
4. Download JSON key file
5. Mount key file in Docker container

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
