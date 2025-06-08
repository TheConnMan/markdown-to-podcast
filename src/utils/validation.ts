export class ContentValidator {
  private static readonly MAX_CONTENT_LENGTH = 500000; // 500KB
  private static readonly MIN_CONTENT_LENGTH = 10;
  // private static readonly ALLOWED_DOMAINS = [
  //   'github.com',
  //   'gitlab.com',
  //   'claude.ai',
  //   'raw.githubusercontent.com',
  // ];

  static validateURL(url: string): { valid: boolean; error?: string } {
    try {
      const parsedURL = new URL(url);

      // Check protocol
      if (!['http:', 'https:'].includes(parsedURL.protocol)) {
        return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
      }

      // Check for localhost in production
      if (
        process.env['NODE_ENV'] === 'production' &&
        (parsedURL.hostname === 'localhost' || parsedURL.hostname === '127.0.0.1')
      ) {
        return { valid: false, error: 'Localhost URLs not allowed in production' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  static validateContent(content: string): { valid: boolean; error?: string } {
    if (content.length < this.MIN_CONTENT_LENGTH) {
      return { valid: false, error: 'Content too short' };
    }

    if (content.length > this.MAX_CONTENT_LENGTH) {
      return { valid: false, error: 'Content too large' };
    }

    return { valid: true };
  }

  static estimateReadingTime(text: string): number {
    const wordsPerMinute = 150; // Average reading speed
    const wordCount = text.split(/\s+/).length;
    return Math.ceil((wordCount / wordsPerMinute) * 60); // Return seconds
  }
}
