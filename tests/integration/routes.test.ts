// Set environment variables before importing the app
process.env['METADATA_FILE'] = './test-data/episodes.json';
process.env['AUDIO_OUTPUT_DIR'] = './test-data/audio';

// Mock Google Cloud Text-to-Speech before importing server
const mockTTSClient = {
  synthesizeSpeech: jest.fn().mockResolvedValue([{
    audioContent: Buffer.from('fake-audio-data')
  }])
};

const mockLongAudioClient = {
  synthesizeLongAudio: jest.fn().mockResolvedValue([{
    name: 'fake-operation'
  }])
};

jest.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: jest.fn(() => mockTTSClient),
  TextToSpeechLongAudioSynthesizeClient: jest.fn(() => mockLongAudioClient)
}));

// Mock child_process for FFmpeg
jest.mock('child_process', () => ({
  execSync: jest.fn().mockReturnValue('60.0')
}));

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn((filePath: string) => {
    // Return false for non-existent test files
    if (filePath.includes('nonexistent.mp3')) {
      return false;
    }
    return true;
  }),
  createReadStream: jest.fn(),
  statSync: jest.fn(() => ({ size: 1000, ctime: new Date() })),
  readdirSync: jest.fn(() => [])
}));

import request from 'supertest';
import app from '../../src/server';

describe('API Routes Integration', () => {
  const API_KEY = 'test-api-key';

  beforeAll(() => {
    process.env['API_KEY'] = API_KEY;
    process.env['PODCAST_UUID'] = 'test-uuid';
  });

  test('POST /api/generate validates input', async () => {
    const response = await request(app)
      .post('/api/generate')
      .set('X-API-Key', API_KEY)
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('content or url must be provided');
  });

  test('POST /api/generate accepts content', async () => {
    const response = await request(app)
      .post('/api/generate')
      .set('X-API-Key', API_KEY)
      .send({ content: 'Test markdown content' });
    
    // The mock should make this succeed
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.episodeId).toBeDefined();
  });

  test('POST /api/generate accepts URL', async () => {
    // Mock fetch for URL processing
    const mockMarkdown = '# Test Article\n\nThis is test content from URL.';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockMarkdown),
    }) as jest.Mock;

    const response = await request(app)
      .post('/api/generate')
      .set('X-API-Key', API_KEY)
      .send({ url: 'https://example.com' });
    
    // The mock should make this succeed
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.episodeId).toBeDefined();
  });

  test('GET /podcast/:uuid validates UUID', async () => {
    const response = await request(app).get('/podcast/wrong-uuid');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Feed not found');
  });

  test('GET /podcast/:uuid with correct UUID', async () => {
    const response = await request(app).get('/podcast/test-uuid');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/rss+xml');
  });

  test('POST /share requires authentication', async () => {
    const response = await request(app)
      .post('/share')
      .send({ url: 'https://example.com' });
    expect(response.status).toBe(401);
  });

  test('POST /share redirects with valid auth', async () => {
    const response = await request(app)
      .post('/share')
      .set('X-API-Key', API_KEY)
      .send({ url: 'https://example.com', title: 'Test' });
    expect(response.status).toBe(302);
  });

  test('GET /audio/:filename validates filename', async () => {
    const response = await request(app).get('/audio/file..with..dots');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid filename');
  });

  test('GET /audio/:filename returns 404 for non-existent file', async () => {
    const response = await request(app).get('/audio/nonexistent.mp3');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Audio file not found');
  });
});