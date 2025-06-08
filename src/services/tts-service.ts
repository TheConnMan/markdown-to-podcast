import { AudioGenerator, AudioGenerationResult } from '../audio-generator';
import { ProcessedContent, AudioConfig } from '../types';
import * as fs from 'fs';
import { logger } from '../utils/logger';

export class TTSService {
  private audioGenerator: AudioGenerator;

  constructor() {
    this.audioGenerator = new AudioGenerator();
  }

  async generateEpisodeAudio(
    content: ProcessedContent,
    voicePreset: string = 'neutral-wavenet'
  ): Promise<AudioGenerationResult> {
    try {
      // Get voice configuration first
      const voicePresets = AudioGenerator.getVoicePresets();
      const voiceConfig = voicePresets[voicePreset];

      if (!voiceConfig) {
        throw new Error(`Unknown voice preset: ${voicePreset}`);
      }

      // Validate Google Cloud credentials
      this.validateGoogleCloudAuth();

      const audioConfig: Partial<AudioConfig> = {
        voice: voiceConfig,
        speakingRate: 1.0,
        pitch: 0,
      };

      // Generate audio
      const result = await this.audioGenerator.generateAudio(content, audioConfig);

      // Cleanup old files after successful generation
      await this.audioGenerator.cleanupOldFiles(25);

      return result;
    } catch (error: unknown) {
      logger.error('TTS Service error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Provide user-friendly error messages
      if (errorMessage.includes('credentials')) {
        throw new Error('Google Cloud TTS authentication failed. Please check your credentials.');
      } else if (errorMessage.includes('quota')) {
        throw new Error('Google Cloud TTS quota exceeded. Please try again later.');
      } else if (errorMessage.includes('ffmpeg')) {
        throw new Error('Audio processing failed. FFmpeg may not be available.');
      } else {
        throw new Error(`Audio generation failed: ${errorMessage}`);
      }
    }
  }

  private validateGoogleCloudAuth(): void {
    const credentials = process.env['GOOGLE_APPLICATION_CREDENTIALS'];

    if (!credentials) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
    }

    if (!fs.existsSync(credentials)) {
      throw new Error(`Google Cloud credentials file not found: ${credentials}`);
    }
  }

  getAvailableVoices(): string[] {
    return Object.keys(AudioGenerator.getVoicePresets());
  }

  estimateCost(
    textLength: number,
    voiceType: 'standard' | 'wavenet' | 'neural' = 'wavenet'
  ): number {
    const pricing = {
      standard: 4 / 1000000, // $4 per 1M characters
      wavenet: 16 / 1000000, // $16 per 1M characters
      neural: 16 / 1000000, // $16 per 1M characters
    };

    return textLength * pricing[voiceType];
  }
}
