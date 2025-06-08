import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Episode, EpisodesMetadata } from './types';
import { AudioGenerationResult } from './types';
import { ProcessedContent } from './types';
import { logger } from './utils/logger';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export class StorageManager {
  private metadataFile: string;
  private audioDir: string;
  private maxEpisodes: number;
  private lockFile: string;

  constructor() {
    this.metadataFile = process.env['METADATA_FILE'] || './data/episodes.json';
    this.audioDir = process.env['AUDIO_OUTPUT_DIR'] || './data/audio';
    this.maxEpisodes = parseInt(process.env['MAX_EPISODES'] || '25');
    this.lockFile = `${this.metadataFile}.lock`;
    
    this.ensureDirectories();
    this.initializeMetadataFile();
  }

  async saveEpisode(
    content: ProcessedContent,
    audioResult: AudioGenerationResult,
    sourceUrl?: string
  ): Promise<Episode> {
    const episode: Episode = {
      id: audioResult.episodeId,
      title: content.title,
      fileName: audioResult.fileName,
      filePath: audioResult.filePath,
      audioPath: audioResult.fileName, // Just filename for RSS URLs
      duration: audioResult.duration,
      fileSize: audioResult.fileSize,
      createdAt: new Date(),
      sourceType: this.mapSourceType(content.sourceType),
      downloadCount: 0,
      ...(sourceUrl && { sourceUrl }),
    };

    await this.withLock(async () => {
      // Load current metadata
      const metadata = await this.loadMetadata();
      
      // Add new episode
      metadata.episodes.unshift(episode); // Add to beginning
      metadata.totalCount = metadata.episodes.length;
      metadata.lastUpdated = new Date();
      
      // Cleanup old episodes if needed
      await this.cleanupOldEpisodes(metadata);
      
      // Save updated metadata
      await this.saveMetadata(metadata);
    });

    logger.info(`Episode saved: ${episode.title} (${episode.id})`);
    return episode;
  }

  async getEpisode(episodeId: string): Promise<Episode | null> {
    const metadata = await this.loadMetadata();
    return metadata.episodes.find(ep => ep.id === episodeId) || null;
  }

  async getAllEpisodes(): Promise<Episode[]> {
    const metadata = await this.loadMetadata();
    return metadata.episodes;
  }

  async getRecentEpisodes(limit: number = 10): Promise<Episode[]> {
    const metadata = await this.loadMetadata();
    return metadata.episodes.slice(0, limit);
  }

  async deleteEpisode(episodeId: string): Promise<boolean> {
    let deleted = false;
    
    await this.withLock(async () => {
      const metadata = await this.loadMetadata();
      const episodeIndex = metadata.episodes.findIndex(ep => ep.id === episodeId);
      
      if (episodeIndex === -1) {
        return;
      }
      
      const episode = metadata.episodes[episodeIndex]!;
      
      // Delete audio file
      const audioFilePath = episode.filePath;
      try {
        if (fs.existsSync(audioFilePath)) {
          await unlink(audioFilePath);
          logger.info(`Deleted audio file: ${episode.fileName}`);
        }
      } catch (error) {
        logger.warn(`Failed to delete audio file ${episode.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Remove from metadata
      metadata.episodes.splice(episodeIndex, 1);
      metadata.totalCount = metadata.episodes.length;
      metadata.lastUpdated = new Date();
      
      await this.saveMetadata(metadata);
      deleted = true;
    });
    
    return deleted;
  }

  async getStorageStats(): Promise<{
    totalEpisodes: number;
    totalDuration: number;
    totalSize: number;
    oldestEpisode: Date | null;
    newestEpisode: Date | null;
  }> {
    const metadata = await this.loadMetadata();
    
    let totalDuration = 0;
    let totalSize = 0;
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;
    
    for (const episode of metadata.episodes) {
      totalDuration += episode.duration;
      totalSize += episode.fileSize;
      
      // Track dates
      const episodeDate = new Date(episode.createdAt);
      if (!oldestDate || episodeDate < oldestDate) {
        oldestDate = episodeDate;
      }
      if (!newestDate || episodeDate > newestDate) {
        newestDate = episodeDate;
      }
    }
    
    return {
      totalEpisodes: metadata.episodes.length,
      totalDuration,
      totalSize,
      oldestEpisode: oldestDate,
      newestEpisode: newestDate,
    };
  }

  async verifyIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
    missingFiles: string[];
    orphanedFiles: string[];
  }> {
    const issues: string[] = [];
    const missingFiles: string[] = [];
    const orphanedFiles: string[] = [];
    
    try {
      const metadata = await this.loadMetadata();
      
      // Check for missing audio files
      for (const episode of metadata.episodes) {
        if (!fs.existsSync(episode.filePath)) {
          missingFiles.push(episode.fileName);
          issues.push(`Missing audio file for episode ${episode.id}: ${episode.fileName}`);
        }
      }
      
      // Check for orphaned audio files
      if (fs.existsSync(this.audioDir)) {
        const audioFiles = fs.readdirSync(this.audioDir).filter(file => file.endsWith('.mp3'));
        const episodeFiles = new Set(metadata.episodes.map(ep => ep.fileName));
        
        for (const audioFile of audioFiles) {
          if (!episodeFiles.has(audioFile)) {
            orphanedFiles.push(audioFile);
            issues.push(`Orphaned audio file: ${audioFile}`);
          }
        }
      }
      
      return {
        valid: issues.length === 0,
        issues,
        missingFiles,
        orphanedFiles,
      };
      
    } catch (error) {
      return {
        valid: false,
        issues: [`Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        missingFiles: [],
        orphanedFiles: [],
      };
    }
  }

  async cleanupOrphanedFiles(): Promise<number> {
    const integrity = await this.verifyIntegrity();
    let cleanedCount = 0;
    
    for (const orphanedFile of integrity.orphanedFiles) {
      try {
        const filePath = path.join(this.audioDir, orphanedFile);
        await unlink(filePath);
        logger.info(`Cleaned up orphaned file: ${orphanedFile}`);
        cleanedCount++;
      } catch (error) {
        logger.warn(`Failed to clean up ${orphanedFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return cleanedCount;
  }

  private ensureDirectories(): void {
    const dataDir = path.dirname(this.metadataFile);
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info(`Created data directory: ${dataDir}`);
    }
    
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
      logger.info(`Created audio directory: ${this.audioDir}`);
    }
  }

  private async initializeMetadataFile(): Promise<void> {
    if (!fs.existsSync(this.metadataFile)) {
      const initialMetadata: EpisodesMetadata = {
        episodes: [],
        totalCount: 0,
        lastUpdated: new Date(),
      };
      
      await this.saveMetadata(initialMetadata);
      logger.info(`Initialized metadata file: ${this.metadataFile}`);
    }
  }

  private async loadMetadata(): Promise<EpisodesMetadata> {
    try {
      const data = await readFile(this.metadataFile, 'utf8');
      const metadata = JSON.parse(data);
      
      // Convert date strings back to Date objects
      metadata.lastUpdated = new Date(metadata.lastUpdated);
      metadata.episodes.forEach((ep: Episode) => {
        ep.createdAt = new Date(ep.createdAt);
      });
      
      return metadata;
    } catch (error) {
      logger.error(`Failed to load metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Return empty metadata if file is corrupted
      return {
        episodes: [],
        totalCount: 0,
        lastUpdated: new Date(),
      };
    }
  }

  private async saveMetadata(metadata: EpisodesMetadata): Promise<void> {
    const data = JSON.stringify(metadata, null, 2);
    await writeFile(this.metadataFile, data, 'utf8');
  }

  private async cleanupOldEpisodes(metadata: EpisodesMetadata): Promise<void> {
    if (metadata.episodes.length <= this.maxEpisodes) {
      return;
    }
    
    const episodesToDelete = metadata.episodes.slice(this.maxEpisodes);
    
    for (const episode of episodesToDelete) {
      // Delete audio file
      try {
        if (fs.existsSync(episode.filePath)) {
          await unlink(episode.filePath);
          logger.info(`Cleaned up old episode: ${episode.title} (${episode.fileName})`);
        }
      } catch (error) {
        logger.warn(`Failed to delete old audio file ${episode.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Remove from metadata
    metadata.episodes = metadata.episodes.slice(0, this.maxEpisodes);
    logger.info(`Cleaned up ${episodesToDelete.length} old episodes`);
  }

  private mapSourceType(sourceType: ProcessedContent['sourceType']): Episode['sourceType'] {
    switch (sourceType) {
      case 'markdown': return 'paste';
      case 'html': return 'url';
      case 'artifact': return 'artifact';
      default: return 'paste';
    }
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    // Simple file-based locking
    const maxRetries = 10;
    const retryDelay = 100; // ms
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try to create lock file
        fs.writeFileSync(this.lockFile, process.pid.toString(), { flag: 'wx' });
        
        try {
          return await operation();
        } finally {
          // Remove lock file
          try {
            fs.unlinkSync(this.lockFile);
          } catch (error) {
            logger.warn(`Failed to remove lock file: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock file exists, wait and retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Could not acquire lock after maximum retries');
  }
}