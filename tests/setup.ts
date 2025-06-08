import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

config({ path: path.join(__dirname, '..', '.env.example') });

process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001';
process.env['API_KEY'] = 'test-api-key';
process.env['PODCAST_UUID'] = 'test-uuid';
process.env['BASE_URL'] = 'http://localhost:3001';
process.env['AUDIO_OUTPUT_DIR'] = './test-data/audio';
process.env['GOOGLE_APPLICATION_CREDENTIALS'] = './tests/fixtures/fake-credentials.json';

// Ensure test directories exist
if (!fs.existsSync('./test-data')) {
  fs.mkdirSync('./test-data', { recursive: true });
}
if (!fs.existsSync('./test-data/audio')) {
  fs.mkdirSync('./test-data/audio', { recursive: true });
}

global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

afterEach(() => {
  jest.clearAllMocks();
});