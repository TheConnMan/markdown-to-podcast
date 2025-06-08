import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ProcessedContent, AudioConfig } from './types';
import { logger } from './utils/logger';
import { TextToSpeechClient, TextToSpeechLongAudioSynthesizeClient } from '@google-cloud/text-to-speech';

let ttsClient: TextToSpeechClient | null = null;
let longAudioClient: TextToSpeechLongAudioSynthesizeClient | null = null;

try {
  ttsClient = new TextToSpeechClient();
  longAudioClient = new TextToSpeechLongAudioSynthesizeClient();
  logger.info('Google Cloud Text-to-Speech clients initialized successfully');
} catch (error) {
  logger.warn('Google Cloud Text-to-Speech clients could not be initialized. TTS functionality will be disabled.', error);
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
    
    if (!ttsClient) {
      throw new Error('TTS functionality is not available. Google Cloud Text-to-Speech client could not be initialized.');
    }
    
    try {
      logger.info(`Starting audio generation for: "${content.title}"`);
      logger.info(`Text length: ${content.text.length} characters`);
      
      // Prepare text for TTS
      const preparedText = this.prepareTextForTTS(content.text);
      
      // Check text length and choose appropriate synthesis method
      const regularLimit = 4500; // Regular TTS limit with safety buffer
      const longAudioLimit = 900000; // Long Audio Synthesis limit (1MB with buffer)
      
      if (preparedText.length <= regularLimit) {
        // Use regular TTS for short content
        logger.info('Using regular TTS synthesis');
        await this.generateSingleChunk(preparedText, filePath, audioConfig);
      } else if (preparedText.length <= longAudioLimit && longAudioClient) {
        // Use Long Audio Synthesis for medium-long content
        logger.info('Using Long Audio Synthesis for large content');
        await this.generateLongAudio(preparedText, filePath, audioConfig, episodeId);
      } else {
        // Fall back to chunking for very long content or if Long Audio not available
        logger.info('Using chunked synthesis as fallback');
        await this.generateChunkedAudio(preparedText, filePath, audioConfig, episodeId);
      }
      
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
      // Fallback: return default duration
      logger.warn('Using fallback duration estimation');
      return 60; // Default fallback
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


  private async generateSingleChunk(
    text: string, 
    outputPath: string, 
    audioConfig: AudioConfig
  ): Promise<void> {
    if (!ttsClient) {
      throw new Error('TTS client not initialized');
    }

    const request = {
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: audioConfig.voice.name,
        ssmlGender: audioConfig.voice.gender as any,
      },
      audioConfig: {
        audioEncoding: audioConfig.audioEncoding as any,
        pitch: audioConfig.pitch,
        speakingRate: audioConfig.speakingRate,
      },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('No audio content received from Google Cloud TTS');
    }
    
    // Write the audio content to file
    fs.writeFileSync(outputPath, response.audioContent, 'binary');
  }

  private async generateLongAudio(
    text: string,
    outputPath: string,
    audioConfig: AudioConfig,
    episodeId: string
  ): Promise<void> {
    if (!longAudioClient) {
      throw new Error('Long Audio client not initialized');
    }

    // For this implementation, we'll fall back to chunking since Long Audio requires GCS
    // In production, you'd set up GCS bucket and use Long Audio Synthesis
    logger.warn('Long Audio Synthesis requires GCS setup, falling back to chunking');
    await this.generateChunkedAudio(text, outputPath, audioConfig, episodeId);
  }

  private async generateChunkedAudio(
    text: string,
    outputPath: string,
    audioConfig: AudioConfig,
    episodeId: string
  ): Promise<void> {
    const maxChunkSize = 4500;
    const chunks = this.splitTextIntoChunks(text, maxChunkSize);
    const tempDir = path.join(this.outputDir, 'temp', episodeId);
    
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
      logger.info(`Splitting text into ${chunks.length} chunks for TTS generation`);
      
      // Generate audio for each chunk
      const tempFiles: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkFile = path.join(tempDir, `chunk-${i.toString().padStart(3, '0')}.mp3`);
        tempFiles.push(chunkFile);
        
        const chunk = chunks[i];
        if (!chunk) continue;
        
        logger.info(`Generating audio for chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        await this.generateSingleChunk(chunk, chunkFile, audioConfig);
      }
      
      // Concatenate all chunks using FFmpeg
      await this.concatenateAudioFiles(tempFiles, outputPath);
      
      logger.info(`Successfully concatenated ${chunks.length} audio chunks`);
    } finally {
      // Clean up temp files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        logger.warn(`Failed to clean up temp directory: ${tempDir}`, error);
      }
    }
  }

  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    let currentPos = 0;
    
    while (currentPos < text.length) {
      let chunkEnd = currentPos + maxChunkSize;
      
      // If we're not at the end, try to break at a sentence boundary
      if (chunkEnd < text.length) {
        const sentenceEnd = text.lastIndexOf('.', chunkEnd);
        const questionEnd = text.lastIndexOf('?', chunkEnd);
        const exclamationEnd = text.lastIndexOf('!', chunkEnd);
        
        const bestBreak = Math.max(sentenceEnd, questionEnd, exclamationEnd);
        
        // If we found a good sentence break and it's not too far back
        if (bestBreak > currentPos + maxChunkSize * 0.7) {
          chunkEnd = bestBreak + 1;
        } else {
          // Fall back to word boundary
          const wordEnd = text.lastIndexOf(' ', chunkEnd);
          if (wordEnd > currentPos + maxChunkSize * 0.5) {
            chunkEnd = wordEnd;
          }
        }
      }
      
      const chunk = text.slice(currentPos, chunkEnd).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      currentPos = chunkEnd;
    }
    
    return chunks;
  }

  private async concatenateAudioFiles(inputFiles: string[], outputPath: string): Promise<void> {
    const { execSync } = require('child_process');
    
    // Verify all input files exist
    for (const file of inputFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Input file does not exist: ${file}`);
      }
    }
    
    // Create a file list for FFmpeg
    const listFile = path.join(path.dirname(outputPath), `filelist-${Date.now()}.txt`);
    // Use absolute paths and proper escaping for FFmpeg concat format
    const fileList = inputFiles.map(file => {
      const absolutePath = path.resolve(file);
      // Escape single quotes in the path by replacing them with '\''
      const escapedPath = absolutePath.replace(/'/g, "'\\''");
      return `file '${escapedPath}'`;
    }).join('\n');
    
    try {
      fs.writeFileSync(listFile, fileList);
      logger.info(`Created filelist for concatenation: ${listFile}`);
      logger.info(`Files to concatenate: ${inputFiles.length}`);
      
      // Use FFmpeg to concatenate the files
      const command = `ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`;
      execSync(command, { encoding: 'utf8' });
    } finally {
      // Clean up the file list
      try {
        fs.unlinkSync(listFile);
      } catch (error) {
        logger.warn(`Failed to clean up file list: ${listFile}`, error);
      }
    }
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