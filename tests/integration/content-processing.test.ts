import { ContentProcessor } from '../../src/content-processor';

describe('Content Processing Integration', () => {
  let processor: ContentProcessor;

  beforeEach(() => {
    processor = new ContentProcessor();
  });

  test('processes GitHub markdown URL', async () => {
    // Mock fetch for testing
    const mockMarkdown = '# GitHub README\n\nThis is a test README file.';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockMarkdown),
    }) as jest.Mock;

    const result = await processor.processContent('https://raw.githubusercontent.com/user/repo/main/README.md', true);
    
    expect(result.title).toBe('GitHub README');
    expect(result.sourceType).toBe('markdown');
    expect(fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/user/repo/main/README.md',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }),
      })
    );
  });

  test('handles fetch errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(
      processor.processContent('https://example.com/not-found.md', true)
    ).rejects.toThrow('Failed to fetch content from URL');
  });
});