import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ProcessedContent, AudioConfig } from './types';
import { logger } from './utils/logger';

let googletts: any = null;
try {
  googletts = require('extra-googletts');
} catch (error) {
  logger.warn('extra-googletts module could not be loaded. TTS functionality will be disabled.', error);
}

export interface AudioGenerationResult {
  filePath: string;
  fileName: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  episodeId: string;
  title: string;
  createdAt: Date;
}

export class AudioGenerator {
  private outputDir: string;
  private defaultConfig: AudioConfig;

  constructor() {
    this.outputDir = process.env['AUDIO_OUTPUT_DIR'] || './data/audio';
    this.ensureOutputDirectory();
    
    this.defaultConfig = {
      voice: {
        gender: 'NEUTRAL',
        name: 'en-US-Wavenet-C',
      },
      audioEncoding: 'MP3',
      pitch: 0,
      speakingRate: 1.0,
    };
  }

  async generateAudio(content: ProcessedContent, config?: Partial<AudioConfig>): Promise<AudioGenerationResult> {
    const episodeId = uuidv4();
    const fileName = `episode-${episodeId}.mp3`;
    const filePath = path.join(this.outputDir, fileName);
    
    const audioConfig = { ...this.defaultConfig, ...config };
    
    if (!googletts) {
      throw new Error('TTS functionality is not available. The extra-googletts module could not be loaded.');
    }
    
    try {
      logger.info(`Starting audio generation for: "${content.title}"`);
      logger.info(`Text length: ${content.text.length} characters`);
      
      // Prepare text for TTS
      const preparedText = this.prepareTextForTTS(content.text);
      
      // Generate audio using extra-googletts
      await googletts(filePath, preparedText, {
        voice: audioConfig.voice,
        audioEncoding: audioConfig.audioEncoding,
        pitch: audioConfig.pitch,
        speakingRate: audioConfig.speakingRate,
        log: true, // Enable logging
        retries: 3, // Retry failed requests
        concurrency: 5, // Concurrent TTS requests
      });
      
      logger.info(`Audio generation completed: ${fileName}`);
      
      // Extract metadata
      const duration = await this.extractAudioDuration(filePath);
      const fileSize = this.getFileSize(filePath);
      
      return {
        filePath,
        fileName,
        duration,
        fileSize,
        episodeId,
        title: content.title,
        createdAt: new Date(),
      };
      
    } catch (error: unknown) {
      // Clean up partial file if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Audio generation failed: ${errorMessage}`);
    }
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`Created audio output directory: ${this.outputDir}`);
    }
  }

  prepareTextForTTS(text: string): string {
    return text
      // Ensure proper sentence endings
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      
      // Add pauses for better speech flow
      .replace(/\n\n+/g, '. ') // Convert paragraph breaks to pauses
      .replace(/\n/g, ' ') // Convert line breaks to spaces
      
      // Handle common abbreviations
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bMr\./g, 'Mister')
      .replace(/\bMrs\./g, 'Missus')
      .replace(/\bMs\./g, 'Miss')
      .replace(/\bProf\./g, 'Professor')
      .replace(/\betc\./g, 'etcetera')
      .replace(/\bi\.e\./g, 'that is')
      .replace(/\be\.g\./g, 'for example')
      
      // Handle technical terms
      .replace(/\bAPI\b/g, 'A P I')
      .replace(/\bURL\b/g, 'U R L')
      .replace(/\bHTML\b/g, 'H T M L')
      .replace(/\bCSS\b/g, 'C S S')
      .replace(/\bJSON\b/g, 'Jason')
      .replace(/\bSQL\b/g, 'sequel')
      
      // Ensure clean text
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async extractAudioDuration(filePath: string): Promise<number> {
    try {
      // Use ffprobe to get duration (part of FFmpeg)
      const { execSync } = require('child_process');
      const command = `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`;
      const output = execSync(command, { encoding: 'utf8' });
      const duration = parseFloat(output.trim());
      
      if (isNaN(duration)) {
        throw new Error('Could not parse audio duration');
      }
      
      return Math.round(duration);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Could not extract audio duration: ${errorMessage}`);
      // Fallback: estimate based on text length (150 words per minute)
      const wordsPerMinute = 150;
      const wordCount = this.countWords(filePath);
      return Math.round((wordCount / wordsPerMinute) * 60);
    }
  }

  private getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Could not get file size: ${errorMessage}`);
      return 0;
    }
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Voice configuration presets
  static getVoicePresets(): Record<string, AudioConfig['voice']> {
    return {
      'neutral-standard': {
        gender: 'NEUTRAL',
        name: 'en-US-Standard-C',
      },
      'neutral-wavenet': {
        gender: 'NEUTRAL',
        name: 'en-US-Wavenet-C',
      },
      'male-wavenet': {
        gender: 'MALE',
        name: 'en-US-Wavenet-A',
      },
      'female-wavenet': {
        gender: 'FEMALE',
        name: 'en-US-Wavenet-E',
      },
      'male-neural': {
        gender: 'MALE',
        name: 'en-US-Neural2-A',
      },
      'female-neural': {
        gender: 'FEMALE',
        name: 'en-US-Neural2-C',
      },
    };
  }

  // Clean up old audio files
  async cleanupOldFiles(maxFiles: number = 25): Promise<void> {
    try {
      const files = fs.readdirSync(this.outputDir)
        .filter(file => file.endsWith('.mp3'))
        .map(file => ({
          name: file,
          path: path.join(this.outputDir, file),
          created: fs.statSync(path.join(this.outputDir, file)).ctime,
        }))
        .sort((a, b) => b.created.getTime() - a.created.getTime());

      if (files.length > maxFiles) {
        const filesToDelete = files.slice(maxFiles);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          logger.info(`Deleted old audio file: ${file.name}`);
        }
        
        logger.info(`Cleaned up ${filesToDelete.length} old audio files`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to cleanup old files: ${errorMessage}`);
    }
  }
}