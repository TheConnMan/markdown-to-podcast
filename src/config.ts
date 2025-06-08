import { config } from 'dotenv';
import { ValidationResult } from './types';

config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiKey: string;
  podcastUuid: string;
  googleCredentials: string;
  audioOutputDir: string;
  metadataFile: string;
  maxEpisodes: number;
  baseUrl: string;
  podcast: {
    title: string;
    description: string;
    author: string;
    email: string;
    language: string;
  };
}

function validateConfig(): ValidationResult {
  const required = [
    'NODE_ENV',
    'PORT',
    'API_KEY', 
    'PODCAST_UUID',
    'BASE_URL',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      return {
        valid: false,
        error: `Missing required environment variable: ${key}`,
      };
    }
  }

  return { valid: true };
}

const validation = validateConfig();
if (!validation.valid) {
  throw new Error(`Configuration validation failed: ${validation.error}`);
}

export const appConfig: AppConfig = {
  port: parseInt(process.env['PORT'] || '3000', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  apiKey: process.env['API_KEY']!,
  podcastUuid: process.env['PODCAST_UUID']!,
  googleCredentials: process.env['GOOGLE_APPLICATION_CREDENTIALS'] || '',
  audioOutputDir: process.env['AUDIO_OUTPUT_DIR'] || './data/audio',
  metadataFile: process.env['METADATA_FILE'] || './data/episodes.json',
  maxEpisodes: parseInt(process.env['MAX_EPISODES'] || '25', 10),
  baseUrl: process.env['BASE_URL']!,
  podcast: {
    title: process.env['PODCAST_TITLE'] || 'Markdown to Podcast',
    description: process.env['PODCAST_DESCRIPTION'] || 'Personal podcast feed for markdown content',
    author: process.env['PODCAST_AUTHOR'] || 'Podcast Generator',
    email: process.env['PODCAST_EMAIL'] || 'noreply@example.com',
    language: process.env['PODCAST_LANGUAGE'] || 'en',
  },
};