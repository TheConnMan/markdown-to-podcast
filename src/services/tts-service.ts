import { AudioGenerator, AudioGenerationResult } from '../audio-generator';
import { ProcessedContent, AudioConfig } from '../types';
import { logger } from '../utils/logger';

export class TTSService {
  private audioGenerator: AudioGenerator;

  constructor() {
    this.audioGenerator = new AudioGenerator();
  }

  async generateEpisodeAudio(
    content: ProcessedContent,
    voicePreset: string = 'chris'
  ): Promise<AudioGenerationResult> {
    try {
      // Get voice configuration first
      const voicePresets = AudioGenerator.getVoicePresets();
      const voiceConfig = voicePresets[voicePreset];

      if (!voiceConfig) {
        throw new Error(`Unknown voice preset: ${voicePreset}`);
      }

      // Validate ElevenLabs API key
      this.validateElevenLabsAuth();

      const audioConfig: Partial<AudioConfig> = {
        voice: {
          gender: voiceConfig.gender as 'MALE' | 'FEMALE' | 'NEUTRAL',
          name: voicePreset,
        },
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
      if (errorMessage.includes('ELEVENLABS_API_KEY')) {
        throw new Error('ElevenLabs TTS authentication failed. Please set the ELEVENLABS_API_KEY environment variable.');
      } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        throw new Error('ElevenLabs API quota exceeded. Please try again later or upgrade your plan.');
      } else if (errorMessage.includes('ffmpeg')) {
        throw new Error('Audio processing failed. FFmpeg may not be available.');
      } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        throw new Error('ElevenLabs API key is invalid. Please check your API key.');
      } else {
        throw new Error(`Audio generation failed: ${errorMessage}`);
      }
    }
  }

  private validateElevenLabsAuth(): void {
    const apiKey = process.env['ELEVENLABS_API_KEY'];

    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable not set');
    }

    // Basic format validation (ElevenLabs keys are typically alphanumeric)
    if (apiKey.length < 20) {
      throw new Error('ELEVENLABS_API_KEY appears to be invalid (too short)');
    }
  }

  getAvailableVoices(): string[] {
    return Object.keys(AudioGenerator.getVoicePresets());
  }

  estimateCost(
    textLength: number,
    _voiceType: 'standard' | 'turbo' = 'turbo'
  ): number {
    // ElevenLabs pricing (approximate, varies by plan):
    // Turbo v2.5: ~$0.18 per 1000 characters (Starter plan)
    // Standard models are more expensive
    const pricing = {
      turbo: 0.18 / 1000, // $0.18 per 1K characters
      standard: 0.30 / 1000, // $0.30 per 1K characters (multilingual v2)
    };

    return textLength * pricing.turbo; // Always use turbo pricing since we use turbo model
  }
}
