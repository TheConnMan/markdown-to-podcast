import { ContentProcessor } from '../../src/content-processor';
import { ContentValidator } from '../../src/utils/validation';

describe('ContentProcessor', () => {
  let processor: ContentProcessor;

  beforeEach(() => {
    processor = new ContentProcessor();
  });

  test('processes simple markdown', async () => {
    const markdown = '# Test Title\n\nThis is a test paragraph.';
    const result = await processor.processContent(markdown, false);
    
    expect(result.title).toBe('Test Title');
    expect(result.text).toContain('This is a test paragraph');
    expect(result.sourceType).toBe('markdown');
  });

  test('extracts title from first heading', async () => {
    const markdown = '## Main Title\n\nContent here.\n\n### Subtitle\n\nMore content.';
    const result = await processor.processContent(markdown, false);
    
    expect(result.title).toBe('Main Title');
  });

  test('removes code blocks from speech text', async () => {
    const markdown = '# Title\n\n```javascript\nconsole.log("test");\n```\n\nRegular text.';
    const result = await processor.processContent(markdown, false);
    
    expect(result.text).not.toContain('console.log');
    expect(result.text).toContain('Regular text');
    expect(result.text).toContain('[Code block omitted]');
  });

  test('cleans inline formatting', async () => {
    const markdown = '# Title\n\nThis is **bold** and *italic* text with `code`.';
    const result = await processor.processContent(markdown, false);
    
    expect(result.text).toContain('bold');
    expect(result.text).toContain('italic');
    expect(result.text).not.toContain('**');
    expect(result.text).not.toContain('*');
    expect(result.text).not.toContain('`');
  });
});

describe('ContentValidator', () => {
  test('validates URLs correctly', () => {
    expect(ContentValidator.validateURL('https://example.com').valid).toBe(true);
    expect(ContentValidator.validateURL('http://example.com').valid).toBe(true);
    expect(ContentValidator.validateURL('ftp://example.com').valid).toBe(false);
    expect(ContentValidator.validateURL('not-a-url').valid).toBe(false);
  });

  test('validates content length', () => {
    expect(ContentValidator.validateContent('Too short').valid).toBe(false);
    expect(ContentValidator.validateContent('This is long enough content for validation').valid).toBe(true);
  });

  test('estimates reading time', () => {
    const text = 'word '.repeat(150); // 150 words
    const time = ContentValidator.estimateReadingTime(text);
    expect(time).toBeGreaterThanOrEqual(60); // Should be about 1 minute
    expect(time).toBeLessThanOrEqual(62); // Allow for rounding
  });
});