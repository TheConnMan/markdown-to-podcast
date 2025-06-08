import { RSSGenerator } from '../rss-generator';
import { StorageService } from './storage-service';
import { Episode } from '../types';
import { logger } from '../utils/logger';

export class RSSService {
  private rssGenerator: RSSGenerator;
  private storageService: StorageService;
  private cache: Map<string, { xml: string; timestamp: Date }>;
  private cacheTimeout: number;

  constructor() {
    this.rssGenerator = new RSSGenerator();
    this.storageService = new StorageService();
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async generatePodcastFeed(): Promise<string> {
    const cacheKey = 'podcast-feed';
    const cached = this.cache.get(cacheKey);

    // Return cached version if recent
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
      return cached.xml;
    }

    try {
      // Get recent episodes (limit to 25 for feed)
      const episodes = await this.storageService.listEpisodes(25);

      // Generate RSS feed
      const feedXml = this.rssGenerator.generateFeed(episodes);

      // Validate feed
      const validation = this.rssGenerator.validateFeed(feedXml);
      if (!validation.valid) {
        logger.warn('RSS feed validation warnings:', validation.errors);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        xml: feedXml,
        timestamp: new Date(),
      });

      return feedXml;
    } catch (error) {
      logger.error('Failed to generate RSS feed:', error);
      throw new Error(`RSS generation failed: ${(error as Error).message}`);
    }
  }

  async getEpisodeCount(): Promise<number> {
    const episodes = await this.storageService.listEpisodes();
    return episodes.length;
  }

  async getLatestEpisode(): Promise<Episode | null> {
    const episodes = await this.storageService.listEpisodes(1);
    return episodes.length > 0 ? episodes[0]! : null;
  }

  async refreshCache(): Promise<void> {
    this.cache.clear();
    await this.generatePodcastFeed();
  }

  getFeedStats(): {
    cacheSize: number;
    lastGenerated: Date | null;
    cacheHits: number;
  } {
    const cached = this.cache.get('podcast-feed');

    return {
      cacheSize: this.cache.size,
      lastGenerated: cached ? cached.timestamp : null,
      cacheHits: 0, // Could implement counter if needed
    };
  }
}
