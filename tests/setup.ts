import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load test environment variables
config({ path: path.join(__dirname, '..', '.env.test') });

// Set default test environment variables
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001';
process.env['API_KEY'] = 'test-api-key';
process.env['PODCAST_UUID'] = 'test-uuid';
process.env['BASE_URL'] = 'http://localhost:3001';
process.env['AUDIO_OUTPUT_DIR'] = './test-data/audio';
process.env['METADATA_FILE'] = './test-data/episodes.json';
process.env['MAX_EPISODES'] = '5';
process.env['ELEVENLABS_API_KEY'] = 'test-elevenlabs-api-key-12345678901234567890';

// Test podcast configuration
process.env['PODCAST_TITLE'] = 'Test Podcast';
process.env['PODCAST_DESCRIPTION'] = 'Test podcast for unit tests';
process.env['PODCAST_AUTHOR'] = 'Test Author';
process.env['PODCAST_EMAIL'] = 'test@example.com';
process.env['PODCAST_LANGUAGE'] = 'en';

// Ensure test directories exist
if (!fs.existsSync('./test-data')) {
  fs.mkdirSync('./test-data', { recursive: true });
}
if (!fs.existsSync('./test-data/audio')) {
  fs.mkdirSync('./test-data/audio', { recursive: true });
}

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log in tests unless needed
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock ElevenLabs SDK
jest.mock('elevenlabs', () => ({
  ElevenLabsClient: jest.fn().mockImplementation(() => ({
    textToSpeech: {
      convert: jest.fn().mockImplementation(async () => {
        // Return an async iterable that yields mock audio data
        return {
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from('mock audio data');
          }
        };
      })
    }
  }))
}));

// Mock fetch for URL processing tests
global.fetch = jest.fn();

// Clean up test data after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidRSSFeed(): R;
      toBeValidJSON(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidRSSFeed(received: string) {
    const pass = received.includes('<?xml version="1.0"') &&
                 received.includes('<rss version="2.0"') &&
                 received.includes('<channel>');

    return {
      message: () => `expected ${received} to be a valid RSS feed`,
      pass,
    };
  },

  toBeValidJSON(received: string) {
    try {
      JSON.parse(received);
      return { message: () => '', pass: true };
    } catch (error) {
      return {
        message: () => `expected ${received} to be valid JSON`,
        pass: false,
      };
    }
  },
});
