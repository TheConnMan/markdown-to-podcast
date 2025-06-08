import MarkdownIt from 'markdown-it';
import * as cheerio from 'cheerio';
import { htmlToText } from 'html-to-text';
import { ProcessedContent } from './types';

export class ContentProcessor {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
  }

  async processContent(input: string, isUrl: boolean = false): Promise<ProcessedContent> {
    if (isUrl) {
      return this.processURL(input);
    } else {
      return this.processMarkdown(input);
    }
  }

  private async processURL(url: string): Promise<ProcessedContent> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Markdown-to-Podcast/1.0',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      
      // Detect content type and process accordingly
      if (this.isClaudeArtifact(url)) {
        return this.processClaudeArtifact(content);
      } else if (this.isMarkdownContent(url, content)) {
        return this.processMarkdown(content);
      } else {
        return this.processHTML(content);
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch content from URL: ${error.message}`);
    }
  }

  private isClaudeArtifact(url: string): boolean {
    return url.includes('claude.ai/public/artifacts/');
  }

  private isMarkdownContent(url: string, content: string): boolean {
    return url.endsWith('.md') || 
           content.includes('# ') || 
           content.includes('## ') ||
           content.includes('### ');
  }

  private processMarkdown(markdown: string): ProcessedContent {
    const tokens = this.md.parse(markdown, {});
    const title = this.extractFirstHeading(tokens) || 'Untitled Episode';
    const text = this.processTokensForSpeech(tokens);

    return {
      title,
      text,
      sourceType: 'markdown',
    };
  }

  private processClaudeArtifact(html: string): ProcessedContent {
    const $ = cheerio.load(html);
    
    // Remove script tags, style tags, and navigation elements
    $('script, style, nav, header, footer, .artifact-header, .artifact-footer').remove();
    
    // Extract main content area
    const mainContent = $('main, article, .artifact-content, .content, body').first();
    
    // Extract title from first heading or page title
    const title = this.extractTitleFromHTML($) || 'Claude Artifact';
    
    // Convert to readable text while preserving structure
    const text = htmlToText(mainContent.html() || '', {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: 'h1', options: { uppercase: false } },
        { selector: 'h2', options: { uppercase: false } },
        { selector: 'h3', options: { uppercase: false } },
        { selector: 'pre', format: 'skip' },
        { selector: 'code', format: 'skip' },
      ],
    });

    return {
      title,
      text: this.cleanTextForSpeech(text),
      sourceType: 'artifact',
    };
  }

  private processHTML(html: string): ProcessedContent {
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, .advertisement, .sidebar').remove();
    
    // Extract title
    const title = this.extractTitleFromHTML($) || 'Web Article';
    
    // Extract main content
    const mainContent = $('main, article, .content, .post-content, body').first();
    
    const text = htmlToText(mainContent.html() || '', {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: 'h1', options: { uppercase: false } },
        { selector: 'h2', options: { uppercase: false } },
        { selector: 'h3', options: { uppercase: false } },
        { selector: 'pre', format: 'skip' },
        { selector: 'code', format: 'skip' },
      ],
    });

    return {
      title,
      text: this.cleanTextForSpeech(text),
      sourceType: 'html',
    };
  }

  private extractFirstHeading(tokens: any[]): string | null {
    for (const token of tokens) {
      if (token.type === 'heading_open' && token.tag === 'h1') {
        const nextToken = tokens[tokens.indexOf(token) + 1];
        if (nextToken && nextToken.type === 'inline') {
          return nextToken.content.trim();
        }
      }
    }
    
    // Fallback to any heading
    for (const token of tokens) {
      if (token.type === 'heading_open') {
        const nextToken = tokens[tokens.indexOf(token) + 1];
        if (nextToken && nextToken.type === 'inline') {
          return nextToken.content.trim();
        }
      }
    }
    
    return null;
  }

  private extractTitleFromHTML($: cheerio.CheerioAPI): string | null {
    // Try different selectors for title
    const titleSelectors = ['h1', 'title', '.title', '.post-title', '.article-title'];
    
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }
    
    return null;
  }

  private processTokensForSpeech(tokens: any[]): string {
    let result = '';
    let inCodeBlock = false;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      switch (token.type) {
        case 'heading_open':
          result += '\n\n';
          break;
          
        case 'heading_close':
          result += '\n\n';
          break;
          
        case 'paragraph_open':
          result += '\n';
          break;
          
        case 'paragraph_close':
          result += '\n';
          break;
          
        case 'list_item_open':
          result += '\n- ';
          break;
          
        case 'list_item_close':
          result += '';
          break;
          
        case 'code_block':
        case 'fence':
          // Skip code blocks for speech
          result += '\n[Code block omitted]\n';
          break;
          
        case 'code_inline':
          // Skip inline code for speech
          break;
          
        case 'inline':
          if (!inCodeBlock) {
            result += this.cleanInlineContent(token.content);
          }
          break;
          
        case 'text':
          if (!inCodeBlock) {
            result += token.content;
          }
          break;
          
        case 'link_open':
          // Skip link URLs, just keep the text
          break;
          
        case 'image':
          result += ' [Image description omitted] ';
          break;
      }
    }
    
    return this.cleanTextForSpeech(result);
  }

  private cleanInlineContent(content: string): string {
    // Remove markdown formatting that shouldn't be spoken
    return content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic
      .replace(/`([^`]+)`/g, '$1')     // Inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image: $1]'); // Images
  }

  private cleanTextForSpeech(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      
      // Remove special characters that don't read well
      .replace(/[#*_`]/g, '')
      
      // Convert common symbols to words
      .replace(/&/g, ' and ')
      .replace(/@/g, ' at ')
      .replace(/\$/g, ' dollars ')
      .replace(/%/g, ' percent ')
      
      // Clean up URLs
      .replace(/https?:\/\/[^\s]+/g, '[link]')
      
      // Remove email addresses
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]')
      
      // Clean up punctuation for better speech
      .replace(/([.!?])\s*([.!?])/g, '$1')
      
      .trim();
  }
}