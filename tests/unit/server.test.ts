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
  existsSync: jest.fn(() => true),
  statSync: jest.fn(() => ({ size: 1000, ctime: new Date() })),
  readdirSync: jest.fn(() => [])
}));

import request from 'supertest';
import app from '../../src/server';

describe('Express Server', () => {
  test('health check returns 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.version).toBeDefined();
  });

  test('404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-route');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Route not found');
  });

  test('API key authentication required', async () => {
    const response = await request(app)
      .post('/api/generate')
      .send({ content: 'test' });
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Invalid or missing API key');
  });

  test('API key authentication success', async () => {
    process.env['API_KEY'] = 'test-key';
    
    const response = await request(app)
      .post('/api/generate')
      .set('X-API-Key', 'test-key')
      .send({ content: '# Test Title\n\nThis is a test content that is long enough.' });
    
    // The mock should make this succeed
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.episodeId).toBeDefined();
  });

  test('API generate validates input', async () => {
    process.env['API_KEY'] = 'test-key';
    const response = await request(app)
      .post('/api/generate')
      .set('X-API-Key', 'test-key')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('content or url must be provided');
  });
});