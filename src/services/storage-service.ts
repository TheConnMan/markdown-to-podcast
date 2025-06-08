import { StorageManager } from '../storage-manager';
import { Episode, ProcessedContent, StorageStats } from '../types';
import { AudioGenerationResult } from '../types';

export class StorageService {
  private storageManager: StorageManager;

  constructor() {
    this.storageManager = new StorageManager();
  }

  async createEpisode(
    content: ProcessedContent,
    audioResult: AudioGenerationResult,
    sourceUrl?: string
  ): Promise<Episode> {
    try {
      const episode = await this.storageManager.saveEpisode(content, audioResult, sourceUrl);
      
      // Run integrity check in background
      setImmediate(() => {
        this.storageManager.verifyIntegrity().then(result => {
          if (!result.valid) {
            console.warn(`Storage integrity issues detected: ${result.issues.join(', ')}`);
          }
        });
      });
      
      return episode;
    } catch (error) {
      console.error('Failed to create episode:', error);
      throw new Error(`Storage error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getEpisode(episodeId: string): Promise<Episode | null> {
    return this.storageManager.getEpisode(episodeId);
  }

  async listEpisodes(limit?: number): Promise<Episode[]> {
    if (limit) {
      return this.storageManager.getRecentEpisodes(limit);
    }
    return this.storageManager.getAllEpisodes();
  }

  async deleteEpisode(episodeId: string): Promise<boolean> {
    return this.storageManager.deleteEpisode(episodeId);
  }

  async getStats(): Promise<StorageStats> {
    const stats = await this.storageManager.getStorageStats();
    
    return {
      ...stats,
      averageEpisodeDuration: stats.totalEpisodes > 0 ? stats.totalDuration / stats.totalEpisodes : 0,
      averageFileSize: stats.totalEpisodes > 0 ? stats.totalSize / stats.totalEpisodes : 0,
    };
  }

  async performMaintenance(): Promise<{
    orphanedFilesRemoved: number;
    integrityValid: boolean;
    issues: string[];
  }> {
    console.log('Starting storage maintenance...');
    
    const orphanedFilesRemoved = await this.storageManager.cleanupOrphanedFiles();
    const integrity = await this.storageManager.verifyIntegrity();
    
    console.log(`Storage maintenance completed. Removed ${orphanedFilesRemoved} orphaned files.`);
    
    return {
      orphanedFilesRemoved,
      integrityValid: integrity.valid,
      issues: integrity.issues,
    };
  }
}