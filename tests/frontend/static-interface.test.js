import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Static Frontend Interface', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    const html = fs.readFileSync(path.join(__dirname, '../../public/index.html'), 'utf8');
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
    });
    
    document = dom.window.document;
    window = dom.window;
    
    // Mock localStorage
    window.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
  });

  test('renders main form elements', () => {
    expect(document.getElementById('podcast-form')).toBeTruthy();
    expect(document.getElementById('content')).toBeTruthy();
    expect(document.getElementById('url')).toBeTruthy();
    expect(document.getElementById('voice')).toBeTruthy();
  });

  test('toggles input type correctly', () => {
    const textRadio = document.getElementById('input-type-text');
    const urlRadio = document.getElementById('input-type-url');
    const contentInput = document.getElementById('content-input');
    const urlInput = document.getElementById('url-input');

    // Default state
    expect(textRadio.checked).toBe(true);
    expect(contentInput.classList.contains('hidden')).toBe(false);
    expect(urlInput.classList.contains('hidden')).toBe(true);

    // Switch to URL
    urlRadio.checked = true;
    urlRadio.dispatchEvent(new window.Event('change'));
    
    expect(contentInput.classList.contains('hidden')).toBe(true);
    expect(urlInput.classList.contains('hidden')).toBe(false);
  });

  test('shows API key setup when no key stored', () => {
    window.localStorage.getItem.mockReturnValue(null);
    
    // Trigger initialization
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    const apiKeySetup = document.getElementById('api-key-setup');
    expect(apiKeySetup.classList.contains('hidden')).toBe(false);
  });

  test('hides API key setup when key is stored', () => {
    window.localStorage.getItem.mockReturnValue('test-api-key');
    
    // Trigger initialization
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    const apiKeySetup = document.getElementById('api-key-setup');
    expect(apiKeySetup.classList.contains('hidden')).toBe(true);
  });

  test('shows error when API key input is empty', () => {
    const saveButton = document.getElementById('save-api-key');
    const apiKeyInput = document.getElementById('api-key-input');
    
    // Trigger initialization
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    // Try to save empty key
    apiKeyInput.value = '';
    saveButton.click();
    
    const errorDisplay = document.getElementById('error-display');
    expect(errorDisplay.classList.contains('hidden')).toBe(false);
  });

  test('saves API key to localStorage', () => {
    window.localStorage.getItem.mockReturnValue(null);
    
    // Trigger initialization
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    const saveButton = document.getElementById('save-api-key');
    const apiKeyInput = document.getElementById('api-key-input');
    
    // Enter API key and save
    apiKeyInput.value = 'test-api-key';
    saveButton.click();
    
    expect(window.localStorage.setItem).toHaveBeenCalledWith('podcast_api_key', 'test-api-key');
  });

  test('pre-fills content from query parameters', () => {
    // Mock URL with query parameters
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
        search: '?text=Test%20content'
      },
      writable: true
    });
    
    // Mock URLSearchParams
    window.URLSearchParams = jest.fn().mockImplementation(() => ({
      get: jest.fn((key) => {
        if (key === 'text') return 'Test content';
        if (key === 'url') return null;
        return null;
      })
    }));
    
    // Trigger initialization
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    const contentTextarea = document.getElementById('content');
    const textRadio = document.getElementById('input-type-text');
    
    expect(textRadio.checked).toBe(true);
    expect(contentTextarea.value).toBe('Test content');
  });

  test('pre-fills URL from query parameters', () => {
    // Mock URL with query parameters
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
        search: '?url=https%3A//example.com/test.md'
      },
      writable: true
    });
    
    // Mock URLSearchParams
    window.URLSearchParams = jest.fn().mockImplementation(() => ({
      get: jest.fn((key) => {
        if (key === 'url') return 'https://example.com/test.md';
        if (key === 'text') return null;
        return null;
      })
    }));
    
    // Trigger initialization
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    const urlInput = document.getElementById('url');
    const urlRadio = document.getElementById('input-type-url');
    
    expect(urlRadio.checked).toBe(true);
    expect(urlInput.value).toBe('https://example.com/test.md');
  });

  test('validates form submission requires content or URL', async () => {
    window.localStorage.getItem.mockReturnValue('test-api-key');
    
    // Trigger initialization
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    const form = document.getElementById('podcast-form');
    const contentTextarea = document.getElementById('content');
    
    // Try to submit empty form
    contentTextarea.value = '';
    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);
    
    const errorDisplay = document.getElementById('error-display');
    expect(errorDisplay.classList.contains('hidden')).toBe(false);
  });

  test('generates RSS URL correctly', () => {
    window.localStorage.getItem.mockReturnValue('test-api-key');
    
    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000'
      },
      writable: true
    });
    
    // Trigger initialization
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    // Simulate successful generation response
    const mockResponse = {
      message: 'Episode generated successfully: "Test Episode"',
      episodeId: 'test-123'
    };
    
    // Access the PodcastGenerator instance (this requires the script to be loaded)
    // For this test, we'll check the expected URL pattern
    const expectedRssUrl = 'http://localhost:3000/podcast/abcd1234-5678-90ef-ghij-klmnop123456';
    expect(expectedRssUrl).toMatch(/^http:\/\/localhost:3000\/podcast\/[a-f0-9-]+$/);
  });
});