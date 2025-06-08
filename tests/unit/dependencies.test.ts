import MarkdownIt from 'markdown-it';
import * as cheerio from 'cheerio';
import { htmlToText } from 'html-to-text';
import RSS from 'rss';
import { v4 as uuidv4 } from 'uuid';

describe('Core Dependencies', () => {
  describe('Markdown Processing', () => {
    test('markdown-it parses markdown correctly', () => {
      const md = new MarkdownIt();
      const result = md.render('# Hello World\n\nThis is a test.');
      expect(result).toContain('<h1>Hello World</h1>');
      expect(result).toContain('<p>This is a test.</p>');
    });

    test('markdown-it handles complex markdown', () => {
      const md = new MarkdownIt();
      const markdown = `
# Main Title

## Subtitle

- Item 1
- Item 2

**Bold text** and *italic text*.

[Link](https://example.com)

\`\`\`javascript
console.log('code block');
\`\`\`
      `;
      
      const result = md.render(markdown);
      expect(result).toContain('<h1>Main Title</h1>');
      expect(result).toContain('<h2>Subtitle</h2>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<strong>Bold text</strong>');
      expect(result).toContain('<em>italic text</em>');
      expect(result).toContain('<a href="https://example.com">Link</a>');
      expect(result).toContain('<code class="language-javascript">');
    });
  });

  describe('HTML Processing', () => {
    test('cheerio loads and parses HTML', () => {
      const html = '<div><h1>Title</h1><p>Content</p></div>';
      const $ = cheerio.load(html);
      expect($('h1').text()).toBe('Title');
      expect($('p').text()).toBe('Content');
    });

    test('cheerio can extract complex content', () => {
      const html = `
        <article>
          <header>
            <h1>Article Title</h1>
            <meta name="author" content="Test Author">
          </header>
          <section>
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </section>
        </article>
      `;
      
      const $ = cheerio.load(html);
      expect($('h1').text()).toBe('Article Title');
      expect($('meta[name="author"]').attr('content')).toBe('Test Author');
      expect($('p').length).toBe(2);
      expect($('p').first().text()).toBe('First paragraph');
    });

    test('html-to-text converts HTML to readable text', () => {
      const html = '<h1>Title</h1><p>This is content.</p>';
      const text = htmlToText(html);
      expect(text).toContain('TITLE');
      expect(text).toContain('This is content.');
    });

    test('html-to-text handles complex HTML structures', () => {
      const html = `
        <div>
          <h1>Main Title</h1>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
          <p>Paragraph with <a href="http://example.com">link</a>.</p>
        </div>
      `;
      
      const text = htmlToText(html, {
        wordwrap: 130
      });
      
      expect(text).toContain('MAIN TITLE');
      expect(text).toContain('* Item 1');
      expect(text).toContain('* Item 2');
      expect(text).toContain('Paragraph with link [http://example.com].');
    });
  });

  describe('RSS Feed Generation', () => {
    test('rss package creates valid feed', () => {
      const feed = new RSS({
        title: 'Test Podcast',
        description: 'Test Description',
        feed_url: 'https://example.com/feed.xml',
        site_url: 'https://example.com',
        language: 'en',
      });

      feed.item({
        title: 'Test Episode',
        description: 'Test episode description',
        url: 'https://example.com/episode/1',
        enclosure: {
          url: 'https://example.com/audio/1.mp3',
          type: 'audio/mpeg',
        },
        date: new Date(),
      });

      const xml = feed.xml();
      expect(xml).toContain('<![CDATA[Test Podcast]]>');
      expect(xml).toContain('<item>');
      expect(xml).toContain('<enclosure');
      expect(xml).toContain('audio/mpeg');
    });

    test('rss feed handles multiple episodes', () => {
      const feed = new RSS({
        title: 'Multi Episode Podcast',
        description: 'Multiple episodes test',
        feed_url: 'https://example.com/feed.xml',
        site_url: 'https://example.com',
        language: 'en',
        managingEditor: 'test@example.com (Test Author)',
      });

      // Add multiple episodes
      for (let i = 1; i <= 3; i++) {
        feed.item({
          title: `Episode ${i}`,
          description: `Description for episode ${i}`,
          url: `https://example.com/episode/${i}`,
          enclosure: {
            url: `https://example.com/audio/${i}.mp3`,
            type: 'audio/mpeg',
          },
          date: new Date(2024, 0, i),
        });
      }

      const xml = feed.xml();
      expect(xml).toContain('<![CDATA[Episode 1]]>');
      expect(xml).toContain('<![CDATA[Episode 2]]>');
      expect(xml).toContain('<![CDATA[Episode 3]]>');
      
      // Count items
      const itemMatches = xml.match(/<item>/g);
      expect(itemMatches).toHaveLength(3);
    });
  });

  describe('UUID Generation', () => {
    test('uuid generates valid UUIDs', () => {
      const id = uuidv4();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('uuid generates unique values', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(uuidv4());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('Express Framework', () => {
    test('express module loads correctly', () => {
      const express = require('express');
      expect(typeof express).toBe('function');
      
      const app = express();
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
      expect(typeof app.get).toBe('function');
      expect(typeof app.post).toBe('function');
    });
  });
});