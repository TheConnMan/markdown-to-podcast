import { RSSGenerator } from '../../src/rss-generator';
import { Episode } from '../../src/types';

describe('RSSGenerator', () => {
  let generator: RSSGenerator;

  beforeEach(() => {
    process.env['PODCAST_UUID'] = 'test-uuid';
    process.env['BASE_URL'] = 'https://example.com';
    process.env['PODCAST_TITLE'] = 'My Markdown Podcast';
    process.env['PODCAST_AUTHOR'] = 'Your Name';
    process.env['PODCAST_EMAIL'] = 'your.email@example.com';
    generator = new RSSGenerator();
  });

  test('generates valid RSS feed', () => {
    const episodes: Episode[] = [
      {
        id: 'episode-1',
        title: 'Test Episode',
        fileName: 'episode-1.mp3',
        filePath: '/audio/episode-1.mp3',
        audioPath: 'episode-1.mp3',
        duration: 120,
        fileSize: 1024000,
        createdAt: new Date('2023-01-01'),
        sourceType: 'paste',
        downloadCount: 0,
      },
    ];

    const feedXml = generator.generateFeed(episodes);
    
    expect(feedXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(feedXml).toContain('version="2.0"');
    expect(feedXml).toContain('<title><![CDATA[Test Episode]]></title>');
    expect(feedXml).toContain('<enclosure url="https://example.com/audio/episode-1.mp3"');
    expect(feedXml).toContain('xmlns:itunes');
  });

  test('validates RSS feed correctly', () => {
    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
        <channel>
          <title>Test Podcast</title>
          <link>https://example.com</link>
          <description>Test Description</description>
        </channel>
      </rss>`;
    
    const validation = generator.validateFeed(validXml);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('formats duration correctly', () => {
    const episodes: Episode[] = [
      {
        id: 'episode-1',
        title: 'Test Episode',
        fileName: 'episode-1.mp3',
        filePath: '/audio/episode-1.mp3',
        audioPath: 'episode-1.mp3',
        duration: 3665, // 1:01:05
        fileSize: 1024000,
        createdAt: new Date(),
        sourceType: 'paste',
        downloadCount: 0,
      },
    ];

    const feedXml = generator.generateFeed(episodes);
    expect(feedXml).toContain('<itunes:duration>1:01:05</itunes:duration>');
  });

  test('handles empty episode list', () => {
    const episodes: Episode[] = [];
    const feedXml = generator.generateFeed(episodes);
    
    expect(feedXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(feedXml).toContain('version="2.0"');
    expect(feedXml).toContain('<channel>');
  });

  test('includes proper iTunes tags', () => {
    const episodes: Episode[] = [
      {
        id: 'episode-1',
        title: 'Test Episode',
        fileName: 'episode-1.mp3',
        filePath: '/audio/episode-1.mp3',
        audioPath: 'episode-1.mp3',
        duration: 120,
        fileSize: 1024000,
        createdAt: new Date('2023-01-01'),
        sourceType: 'url',
        sourceUrl: 'https://example.com/article',
        downloadCount: 0,
      },
    ];

    const feedXml = generator.generateFeed(episodes);
    
    expect(feedXml).toContain('<itunes:author>');
    expect(feedXml).toContain('<itunes:summary>');
    expect(feedXml).toContain('<itunes:duration>');
    expect(feedXml).toContain('<itunes:explicit>false</itunes:explicit>');
  });

  test('validates feed with missing required elements', () => {
    const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Test Podcast</title>
        </channel>
      </rss>`;
    
    const validation = generator.validateFeed(invalidXml);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Missing required element: link');
    expect(validation.errors).toContain('Missing required element: description');
  });

  test('includes source URL in episode description when available', () => {
    const episodes: Episode[] = [
      {
        id: 'episode-1',
        title: 'Test Episode',
        fileName: 'episode-1.mp3',
        filePath: '/audio/episode-1.mp3',
        audioPath: 'episode-1.mp3',
        duration: 120,
        fileSize: 1024000,
        createdAt: new Date('2023-01-01'),
        sourceType: 'url',
        sourceUrl: 'https://example.com/article',
        downloadCount: 0,
      },
    ];

    const feedXml = generator.generateFeed(episodes);
    expect(feedXml).toContain('Source: https://example.com/article');
  });
});