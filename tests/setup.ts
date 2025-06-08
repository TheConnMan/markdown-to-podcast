import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(__dirname, '..', '.env.example') });

process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001';
process.env['API_KEY'] = 'test-api-key';
process.env['PODCAST_UUID'] = 'test-uuid';
process.env['BASE_URL'] = 'http://localhost:3001';

global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

afterEach(() => {
  jest.clearAllMocks();
});