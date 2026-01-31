# Markdown to Podcast - Product Requirements Document

## Overview

A lightweight TypeScript web application that converts markdown content into transient podcast episodes by generating audio using ElevenLabs text-to-speech API and serving them via a personal RSS feed for immediate consumption.

## MVP Core Features

### 1. Content Input
- **Markdown Paste**: Simple textarea for pasting markdown content directly
- **URL Import**: Input field to fetch markdown from publicly accessible URLs
- **Claude Artifact Support**: Handle Claude public artifact URLs (HTML with rendered content)
- **Content Processing**: Parse markdown, extract text from HTML artifacts, extract first heading as title

### 2. Audio Generation
- **ElevenLabs TTS Integration**: Convert markdown text to MP3 using ElevenLabs Text-to-Speech API
- **Automatic Chunking**: Handle long content by splitting into chunks (up to 4500 chars per request)
- **Built-in Concatenation**: FFmpeg handles audio concatenation without gaps/clicks
- **Duration Calculation**: Automatic audio duration extraction
- **Voice Customization**: Multiple pre-configured voice options (Chris, Adam, Rachel, etc.)
- **Turbo Model**: Uses `eleven_turbo_v2_5` for cost-efficient generation
- **Single Audio File**: Outputs one continuous episode file ready for podcast consumption

### 3. Content Management
- **Auto-generated Titles**: Extract first heading from markdown as episode title
- **No Summaries**: Skip episode descriptions for MVP simplicity
- **Metadata Storage**: Store episode information in JSON file (title, audio path, creation date)

### 4. Audio Storage
- **Filesystem Storage**: Store audio files in container filesystem
- **Optional Volume Mount**: Configurable persistent storage for audio files
- **Ephemeral by Design**: Files designed for immediate download by podcast apps
- **File Cleanup**: Automatic cleanup after 25 episodes (oldest removed)

### 5. RSS Feed Generation
- **Personal Feed**: Generate RSS 2.0 compliant podcast feed with validation
- **Episode Limit**: Maximum 25 episodes in feed
- **Duration Tags**: Include audio duration metadata for podcast app compatibility
- **File-based**: Generate RSS from JSON metadata file

### 6. Minimal Web Interface
- **Static HTML**: Single hardcoded HTML page with basic form
- **Vanilla JavaScript**: Simple JS for form submission and localStorage API key
- **CSS Framework**: Tailwind CSS via CDN for clean styling (no JavaScript components)
- **PWA Essentials**: Minimal service worker + manifest for share target only
- **No UI Framework**: Just HTML, CSS, and vanilla JavaScript
- **HTTPS Required**: For PWA installation and share target functionality

### 7. Basic Security
- **One-time Setup**: API key prompted on first PWA launch, stored in localStorage
- **Header Authentication**: Client sends API key via `X-API-Key` header
- **Environment Variables**: Server validates against `API_KEY` env var
- **Obfuscated RSS URL**: RSS feed served at `/podcast/${PODCAST_UUID}` endpoint
- **Persistent Storage**: localStorage persists across PWA usage

## Technical Architecture

### Minimal TypeScript Stack
- **Runtime**: Node.js with TypeScript
- **Base Image**: Ubuntu Slim with FFmpeg for audio processing
- **Web Framework**: Express.js (minimal routes only)
- **UI**: Static HTML + vanilla JavaScript (no framework)
- **Container**: Single Docker container with FFmpeg
- **Storage**: Container filesystem with optional volume mount
- **Metadata**: JSON file storage

### Core Dependencies
- **ElevenLabs TTS**: `elevenlabs` npm package for text-to-speech
- **Markdown Parser**: `markdown-it` for parsing and text extraction
- **RSS Generator**: `rss` npm package for valid podcast feeds with validation
- **PWA Minimal**: Basic service worker + manifest for share target only

### Deployment Options
- **Development**: Local Docker container
- **Production**: Docker container behind Traefik proxy
- **HTTPS**: Handled by Traefik (automatic Let's Encrypt)
- **Storage**: Filesystem with optional persistent volume mounting

## User Journey (MVP)

### First Time Setup
1. **Install PWA**: User installs app to Android home screen via browser
2. **First Launch**: App prompts for API key, stores in localStorage
3. **Setup Complete**: Ready for seamless sharing

### Regular Use
1. **Share from any app**: User finds markdown URL in browser/app → Share → "Markdown to Podcast"
2. **Automatic processing**: App uses stored API key, extracts title from first heading
3. **Audio generation**: App chunks content, calls ElevenLabs TTS, concatenates audio
4. **Episode creation**: Audio saved locally, RSS feed updated
5. **Notification**: User sees success message with RSS feed URL
6. **Podcast consumption**: Podcast app downloads new episode automatically

## Implementation Priority

**Phase 1 (MVP)**: Core markdown processing, ElevenLabs TTS with chunking, filesystem storage, basic RSS generation
**Phase 2**: PWA with share target, enhanced error handling, volume mounting options
**Phase 3**: User accounts, multiple feeds, advanced features

## Key Technical Decisions

### Audio Processing Strategy
```typescript
import MarkdownIt from 'markdown-it';
import { ElevenLabsClient } from 'elevenlabs';

const md = new MarkdownIt();
const tokens = md.parse(markdownContent, {});

// Extract title from first heading
const firstHeading = extractFirstHeading(tokens);

// Process tokens into readable sections - strip code blocks, format lists
const readableText = processMarkdownForSpeech(tokens);

// Generate audio using ElevenLabs
const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
const audioStream = await client.textToSpeech.convert('iP95p4xoKVk53GoZ742B', {
  text: readableText,
  model_id: 'eleven_turbo_v2_5',
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
  }
});
```

### Minimal Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "elevenlabs": "^1.0.0",
    "markdown-it": "^14.0.0",
    "rss": "^1.2.2",
    "uuid": "^9.0.0",
    "cheerio": "^1.0.0",
    "html-to-text": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "ts-node": "^10.9.0",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  },
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### Express Routes (Minimal)
```typescript
import express from 'express';

const app = express();

// Static files (HTML, manifest, service worker)
app.use(express.static('public'));

// API routes
app.post('/api/generate', authenticateKey, generatePodcast);
app.post('/share', authenticateKey, handleShare);
app.get(`/podcast/${process.env.PODCAST_UUID}`, serveRSSFeed);
app.get('/audio/:filename', serveAudio);
```

### Content Processing Strategy
```typescript
async function processURL(url: string) {
  const response = await fetch(url);
  const content = await response.text();

  // Detect content type
  if (url.includes('claude.ai/public/artifacts/')) {
    // Claude artifact: extract text from rendered HTML
    return extractTextFromClaudeArtifact(content);
  } else if (url.endsWith('.md') || content.includes('# ')) {
    // Pure markdown
    return content;
  } else {
    // HTML: convert to readable text
    return htmlToText(content);
  }
}
```

### Docker Setup
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### File Structure
```
/markdown-to-podcast
  /public
    index.html
    manifest.json
    service-worker.js
  /src
    server.ts
    podcast.ts
  /data
    episodes.json
    /audio
```

## Cost Analysis

### ElevenLabs Pricing
- **Turbo v2.5**: ~$0.18 per 1K characters (varies by plan)
- **Starter Plan**: 30,000 characters/month included
- **Creator Plan**: 100,000 characters/month

### Usage Estimate (20 articles/month, ~7K characters each)
- **Total monthly usage**: ~140K characters
- **Cost with Starter Plan**: ~$20/month after free tier
- **Cost with Creator Plan**: ~$5/month after included characters

## Testing Strategy

### Unit Tests
- **Markdown Processing**: Test markdown parsing, title extraction, content cleaning
- **Claude Artifact Processing**: Test HTML content extraction from artifact URLs
- **Audio Generation**: Mock ElevenLabs API calls, test chunking logic
- **RSS Feed Generation**: Test valid RSS 2.0 output, episode metadata
- **File Management**: Test episode cleanup, JSON metadata operations
- **URL Processing**: Test different content types (markdown, HTML, Claude artifacts)

### Integration Tests
- **Full Pipeline**: Markdown input → Audio generation → RSS feed → File storage
- **API Routes**: Test all Express endpoints with mocked dependencies
- **Error Handling**: Test TTS failures, invalid markdown, network timeouts

### GitHub Actions
- **Test Runner**: Automated testing on push/PR using Jest
- **Container Publishing**: Build and push to container registry
- **Security**: Use GitHub secrets for ElevenLabs API key

## Local Development & Testing

### Development Approach: Docker-First
**Problem**: FFmpeg installation on local WSL can be messy and pollutes system
**Solution**: Develop inside Docker container with volume mounting for hot reload

### Prerequisites Setup
- ElevenLabs account with API key
- LocalTunnel (LT) for HTTPS testing: `npm install -g localtunnel`
- Docker + Docker Compose

### Development Workflow
```bash
# Development with hot reload (no local FFmpeg needed)
docker-compose -f docker-compose.dev.yml up

# In separate terminal, create HTTPS tunnel
lt --port 3000 --subdomain markdown-podcast-[username]

# Access via: https://markdown-podcast-[username].loca.lt
```

### Docker Development Setup
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src          # Hot reload source
      - ./public:/app/public    # Static files
      - ./data:/app/data        # Persistent data
      - ./.env:/app/.env        # Environment variables
    environment:
      - NODE_ENV=development
      - API_KEY=${API_KEY}
      - PODCAST_UUID=${PODCAST_UUID}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
```

```dockerfile
# Dockerfile.dev
FROM node:18-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]  # ts-node-dev for hot reload
```

### End-to-End Testing Plan
**Target**: Complete local testing before deployment

1. **PWA Installation**:
   - Open tunnel URL on Android Chrome
   - Install PWA to home screen
   - Verify share target appears in Android share menu

2. **Core Functionality**:
   - Input API key (one-time setup)
   - Test markdown paste functionality
   - Test Claude artifact URL processing
   - Test regular markdown URL fetching
   - Verify audio generation and RSS feed creation
   - Check episode appears in RSS feed at `/podcast/${UUID}`

3. **Podcast Integration**:
   - Add RSS feed URL to podcast app: `https://your-tunnel-url.loca.lt/podcast/${UUID}`
   - Verify episode downloads and plays correctly
   - Test audio quality and duration

4. **Share Target Testing**:
   - Share markdown URL from browser/app
   - Verify PWA opens with pre-filled URL
   - Complete processing workflow

## Setup Instructions

### ElevenLabs Authentication
1. **Create Account**: https://elevenlabs.io
2. **Get API Key**: Settings → API Keys → Generate
3. **Local Setup**: Add to `.env` file as `ELEVENLABS_API_KEY`

### GitHub Actions Credentials
1. **GitHub Secrets**:
   - `ELEVENLABS_API_KEY`: Your ElevenLabs API key
   - `API_KEY`: Your application's authentication secret
   - `PODCAST_UUID`: Generated UUID for RSS feed obfuscation

### Local Environment
```bash
# Required environment variables (.env file)
ELEVENLABS_API_KEY="your-elevenlabs-api-key"
API_KEY="your-secret-key"
PODCAST_UUID="abcd1234-5678-90ef-ghij-klmnop123456"
PORT=3000
NODE_ENV=development
```

### Development Benefits
- **No FFmpeg pollution**: Contained within Docker
- **Hot reload**: `ts-node-dev` watches for changes
- **Consistent environment**: Same setup across machines
- **Easy cleanup**: `docker-compose down` removes everything
- **Volume mounting**: Code changes reflect immediately

## Claude Artifact URL Support

### Research Findings
Claude artifacts can be made public and shared via URLs, appearing as rendered HTML content in dedicated windows with both preview and underlying code/markdown. These artifacts often contain markdown content that's been rendered to HTML.

### Implementation Strategy
```typescript
function extractTextFromClaudeArtifact(html: string): string {
  const $ = cheerio.load(html);

  // Remove script tags, style tags, and navigation elements
  $('script, style, nav, header, footer').remove();

  // Extract main content area
  const mainContent = $('main, article, .artifact-content, body').first();

  // Convert to readable text while preserving structure
  return html2text(mainContent.html(), {
    wordwrap: false,
    preserveNewlines: true
  });
}
```

### Supported URL Patterns
- `https://claude.ai/public/artifacts/[uuid]` - Public Claude artifacts
- `*.md` - Direct markdown files
- Any URL with markdown-like content

## Deployment

### Production (Traefik + Docker)
- **Reverse Proxy**: Traefik handles HTTPS + Let's Encrypt
- **Container**: Docker container with ElevenLabs integration
- **Configuration**: Docker Compose with Traefik labels

### Local Testing Alternative
- **LocalTunnel**: Provides instant HTTPS for PWA testing
- **No Infrastructure**: Zero setup, perfect for development
- **Shareable**: Unique subdomain for easy testing
