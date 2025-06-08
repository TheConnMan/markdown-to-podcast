import RSS from 'rss';
import { Episode, RSSConfig, RSSValidation } from './types';

export class RSSGenerator {
  private config: RSSConfig;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env['BASE_URL'] || 'http://localhost:3000';
    this.config = {
      title: process.env['PODCAST_TITLE'] || 'Markdown to Podcast',
      description: process.env['PODCAST_DESCRIPTION'] || 'Personal podcast feed for markdown content',
      feedUrl: `${this.baseUrl}/podcast/${process.env['PODCAST_UUID']}`,
      siteUrl: this.baseUrl,
      author: process.env['PODCAST_AUTHOR'] || 'Markdown to Podcast',
      language: process.env['PODCAST_LANGUAGE'] || 'en',
    };
  }

  generateFeed(episodes: Episode[]): string {
    const feed = new RSS({
      title: this.config.title,
      description: this.config.description,
      feed_url: this.config.feedUrl,
      site_url: this.config.siteUrl,
      image_url: `${this.baseUrl}/podcast-logo.png`,
      managingEditor: this.config.author,
      webMaster: this.config.author,
      copyright: `Copyright ${new Date().getFullYear()} ${this.config.author}`,
      language: this.config.language,
      categories: ['Technology', 'Education'],
      pubDate: episodes.length > 0 ? episodes[0]!.createdAt : new Date(),
      ttl: 60, // Cache for 1 hour
      
      // iTunes-specific tags
      custom_namespaces: {
        'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
        'atom': 'http://www.w3.org/2005/Atom',
      },
      custom_elements: [
        { 'itunes:author': this.config.author },
        { 'itunes:summary': this.config.description },
        { 'itunes:owner': [
          { 'itunes:name': this.config.author },
          { 'itunes:email': process.env['PODCAST_EMAIL'] || 'noreply@example.com' },
        ]},
        { 'itunes:image': { _attr: { href: `${this.baseUrl}/podcast-logo.png` } } },
        { 'itunes:category': { _attr: { text: 'Technology' } } },
        { 'itunes:explicit': 'false' },
        { 'itunes:type': 'episodic' },
        { 'atom:link': { _attr: { 
          href: this.config.feedUrl, 
          rel: 'self', 
          type: 'application/rss+xml' 
        }}},
      ],
    });

    // Add episodes to feed
    for (const episode of episodes) {
      this.addEpisodeToFeed(feed, episode);
    }

    return feed.xml({ indent: true });
  }

  private addEpisodeToFeed(feed: RSS, episode: Episode): void {
    const audioUrl = `${this.baseUrl}/audio/${episode.audioPath || episode.fileName}`;
    const episodeUrl = `${this.baseUrl}/episode/${episode.id}`;
    
    feed.item({
      title: episode.title,
      description: this.generateEpisodeDescription(episode),
      url: episodeUrl,
      guid: episode.id,
      categories: this.getEpisodeCategories(episode),
      author: this.config.author,
      date: episode.createdAt,
      
      // Audio enclosure
      enclosure: {
        url: audioUrl,
        type: 'audio/mpeg',
        size: episode.fileSize || this.estimateFileSize(episode.duration), // Use actual or estimate
      },
      
      // iTunes episode tags
      custom_elements: [
        { 'itunes:author': this.config.author },
        { 'itunes:subtitle': this.truncateText(episode.title, 100) },
        { 'itunes:summary': this.generateEpisodeDescription(episode) },
        { 'itunes:duration': this.formatDuration(episode.duration) },
        { 'itunes:explicit': 'false' },
        { 'itunes:episodeType': 'full' },
      ],
    });
  }

  private generateEpisodeDescription(episode: Episode): string {
    let description = `Episode: ${episode.title}`;
    
    if (episode.sourceUrl) {
      description += `\n\nSource: ${episode.sourceUrl}`;
    }
    
    description += `\n\nGenerated on ${episode.createdAt.toLocaleDateString()}`;
    description += `\nDuration: ${this.formatDuration(episode.duration)}`;
    description += `\nSource Type: ${this.formatSourceType(episode.sourceType)}`;
    
    return description;
  }

  private getEpisodeCategories(episode: Episode): string[] {
    const categories = ['Episode'];
    
    switch (episode.sourceType) {
      case 'url':
        categories.push('Web Content');
        break;
      case 'artifact':
        categories.push('Claude Artifact');
        break;
      case 'paste':
        categories.push('Text Content');
        break;
    }
    
    return categories;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  private formatSourceType(sourceType: Episode['sourceType']): string {
    switch (sourceType) {
      case 'url': return 'Web URL';
      case 'artifact': return 'Claude Artifact';
      case 'paste': return 'Direct Input';
      default: return 'Unknown';
    }
  }

  private estimateFileSize(durationSeconds: number): number {
    // Estimate MP3 file size (128 kbps average)
    const bytesPerSecond = 16000; // 128 kbps / 8 bits per byte
    return durationSeconds * bytesPerSecond;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 3) + '...';
  }

  validateFeed(feedXml: string): RSSValidation {
    const errors: string[] = [];
    
    try {
      // Basic XML validation
      if (!feedXml.includes('<?xml')) {
        errors.push('Missing XML declaration');
      }
      
      if (!feedXml.includes('<rss')) {
        errors.push('Missing RSS root element');
      }
      
      if (!feedXml.includes('<channel>')) {
        errors.push('Missing channel element');
      }
      
      // Check required RSS elements
      const requiredElements = ['title', 'link', 'description'];
      for (const element of requiredElements) {
        if (!feedXml.includes(`<${element}>`)) {
          errors.push(`Missing required element: ${element}`);
        }
      }
      
      // Check iTunes namespace
      if (!feedXml.includes('xmlns:itunes')) {
        errors.push('Missing iTunes namespace');
      }
      
      return { valid: errors.length === 0, errors };
      
    } catch (error) {
      return { valid: false, errors: [`Validation error: ${(error as Error).message}`] };
    }
  }
}