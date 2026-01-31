import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ProcessedContent, AudioConfig } from './types';
import { logger } from './utils/logger';
import { ElevenLabsClient } from 'elevenlabs';

// ElevenLabs client - initialized lazily when API key is available
let elevenLabsClient: ElevenLabsClient | null = null;

function getElevenLabsClient(): ElevenLabsClient {
  if (!elevenLabsClient) {
    const apiKey = process.env['ELEVENLABS_API_KEY'];
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable not set');
    }
    elevenLabsClient = new ElevenLabsClient({ apiKey });
    logger.info('ElevenLabs client initialized successfully');
  }
  return elevenLabsClient;
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

// ElevenLabs voice configuration
export interface ElevenLabsVoiceConfig {
  voiceId: string;
  voiceName: string;
  modelId: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export class AudioGenerator {
  private outputDir: string;
  private defaultVoiceConfig: ElevenLabsVoiceConfig;

  constructor() {
    this.outputDir = process.env['AUDIO_OUTPUT_DIR'] || './data/audio';
    this.ensureOutputDirectory();

    // Default to Chris voice with turbo model
    this.defaultVoiceConfig = {
      voiceId: 'iP95p4xoKVk53GoZ742B', // Chris
      voiceName: 'chris',
      modelId: 'eleven_turbo_v2_5', // Turbo model for cost efficiency
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0,
      useSpeakerBoost: true,
    };
  }

  async generateAudio(content: ProcessedContent, config?: Partial<AudioConfig>): Promise<AudioGenerationResult> {
    const episodeId = uuidv4();
    const fileName = `episode-${episodeId}.mp3`;
    const filePath = path.join(this.outputDir, fileName);

    // Get voice config from preset if provided
    const voiceConfig = this.getVoiceConfigFromPreset(config?.voice?.name);

    try {
      logger.info(`Starting audio generation for: "${content.title}"`);
      logger.info(`Text length: ${content.text.length} characters`);
      logger.info(`Using voice: ${voiceConfig.voiceName} with model: ${voiceConfig.modelId}`);

      // Prepare text for TTS
      const preparedText = this.prepareTextForTTS(content.text);

      // ElevenLabs has a ~5000 character limit per request for most plans
      const maxChunkSize = 4500;

      if (preparedText.length <= maxChunkSize) {
        // Use single request for short content
        logger.info('Using single request synthesis');
        await this.generateSingleChunk(preparedText, filePath, voiceConfig);
      } else {
        // Use chunking for longer content
        logger.info('Using chunked synthesis for large content');
        await this.generateChunkedAudio(preparedText, filePath, voiceConfig, episodeId);
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

  private getVoiceConfigFromPreset(presetName?: string): ElevenLabsVoiceConfig {
    if (!presetName) {
      return this.defaultVoiceConfig;
    }

    const presets = AudioGenerator.getVoicePresets();
    const preset = presets[presetName];

    if (!preset) {
      logger.warn(`Unknown voice preset: ${presetName}, using default (chris)`);
      return this.defaultVoiceConfig;
    }

    return {
      voiceId: preset.voiceId,
      voiceName: presetName,
      modelId: 'eleven_turbo_v2_5', // Always use turbo for cost efficiency
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0,
      useSpeakerBoost: true,
    };
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
    voiceConfig: ElevenLabsVoiceConfig
  ): Promise<void> {
    const client = getElevenLabsClient();

    const audioStream = await client.textToSpeech.convert(voiceConfig.voiceId, {
      text,
      model_id: voiceConfig.modelId,
      voice_settings: {
        stability: voiceConfig.stability ?? 0.5,
        similarity_boost: voiceConfig.similarityBoost ?? 0.75,
        style: voiceConfig.style ?? 0,
        use_speaker_boost: voiceConfig.useSpeakerBoost ?? true,
      },
    });

    // Collect chunks from the stream
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }

    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      throw new Error('No audio content received from ElevenLabs');
    }

    // Write the audio content to file
    fs.writeFileSync(outputPath, audioBuffer);
  }

  private async generateChunkedAudio(
    text: string,
    outputPath: string,
    voiceConfig: ElevenLabsVoiceConfig,
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
        await this.generateSingleChunk(chunk, chunkFile, voiceConfig);
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

  // ElevenLabs voice presets
  // Voice IDs from ElevenLabs pre-made voices
  static getVoicePresets(): Record<string, { voiceId: string; gender: string; name: string }> {
    return {
      // Default - Chris (user's preferred voice)
      'chris': {
        voiceId: 'iP95p4xoKVk53GoZ742B',
        gender: 'MALE',
        name: 'Chris',
      },
      // Male voices
      'adam': {
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        gender: 'MALE',
        name: 'Adam',
      },
      'brian': {
        voiceId: 'nPczCjzI2devNBz1zQrb',
        gender: 'MALE',
        name: 'Brian',
      },
      'daniel': {
        voiceId: 'onwK4e9ZLuTAKqWW03F9',
        gender: 'MALE',
        name: 'Daniel',
      },
      // Female voices
      'rachel': {
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        gender: 'FEMALE',
        name: 'Rachel',
      },
      'domi': {
        voiceId: 'AZnzlk1XvdvUeBnXmlld',
        gender: 'FEMALE',
        name: 'Domi',
      },
      'elli': {
        voiceId: 'MF3mGyEYCl7XYWbV9V6O',
        gender: 'FEMALE',
        name: 'Elli',
      },
      'charlotte': {
        voiceId: 'XB0fDUnXU5powFXDhCwa',
        gender: 'FEMALE',
        name: 'Charlotte',
      },
      // Neutral/versatile voices
      'callum': {
        voiceId: 'N2lVS1w4EtoT3dr4eOWO',
        gender: 'MALE',
        name: 'Callum',
      },
      'charlie': {
        voiceId: 'IKne3meq5aSn9XLyUdCD',
        gender: 'MALE',
        name: 'Charlie',
      },
      // Legacy preset mappings (for backwards compatibility)
      'neutral-standard': {
        voiceId: 'iP95p4xoKVk53GoZ742B', // Chris
        gender: 'MALE',
        name: 'Chris',
      },
      'neutral-wavenet': {
        voiceId: 'iP95p4xoKVk53GoZ742B', // Chris
        gender: 'MALE',
        name: 'Chris',
      },
      'male-wavenet': {
        voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam
        gender: 'MALE',
        name: 'Adam',
      },
      'female-wavenet': {
        voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
        gender: 'FEMALE',
        name: 'Rachel',
      },
      'neutral-neural': {
        voiceId: 'iP95p4xoKVk53GoZ742B', // Chris
        gender: 'MALE',
        name: 'Chris',
      },
      'male-neural': {
        voiceId: 'nPczCjzI2devNBz1zQrb', // Brian
        gender: 'MALE',
        name: 'Brian',
      },
      'female-neural': {
        voiceId: 'XB0fDUnXU5powFXDhCwa', // Charlotte
        gender: 'FEMALE',
        name: 'Charlotte',
      },
      'neutral-studio': {
        voiceId: 'iP95p4xoKVk53GoZ742B', // Chris
        gender: 'MALE',
        name: 'Chris',
      },
      'male-studio': {
        voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
        gender: 'MALE',
        name: 'Daniel',
      },
      'female-studio': {
        voiceId: 'AZnzlk1XvdvUeBnXmlld', // Domi
        gender: 'FEMALE',
        name: 'Domi',
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
