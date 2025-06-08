import puppeteer from 'puppeteer';

describe('Frontend E2E Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    // Clear localStorage before each test
    await page.evaluateOnNewDocument(() => {
      localStorage.clear();
    });
  });

  test('loads homepage successfully', async () => {
    await page.goto('http://localhost:3000');
    
    const title = await page.title();
    expect(title).toBe('Markdown to Podcast');
    
    const heading = await page.$eval('h1', el => el.textContent);
    expect(heading).toContain('Markdown to Podcast');
  });

  test('shows API key setup on first visit', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for JavaScript to load and initialize
    await page.waitForSelector('#api-key-setup');
    
    const isApiKeySetupVisible = await page.evaluate(() => {
      const apiKeySetup = document.getElementById('api-key-setup');
      return !apiKeySetup.classList.contains('hidden');
    });
    
    expect(isApiKeySetupVisible).toBe(true);
  });

  test('can save API key', async () => {
    await page.goto('http://localhost:3000');
    
    await page.waitForSelector('#api-key-input');
    await page.type('#api-key-input', 'test-api-key');
    await page.click('#save-api-key');
    
    // Check that API key setup is hidden after saving
    const isApiKeySetupHidden = await page.evaluate(() => {
      const apiKeySetup = document.getElementById('api-key-setup');
      return apiKeySetup.classList.contains('hidden');
    });
    
    expect(isApiKeySetupHidden).toBe(true);
  });

  test('toggles between input types', async () => {
    await page.goto('http://localhost:3000');
    
    // Initially text input should be visible
    const initialTextVisible = await page.evaluate(() => {
      const contentInput = document.getElementById('content-input');
      return !contentInput.classList.contains('hidden');
    });
    expect(initialTextVisible).toBe(true);
    
    // Click URL radio button
    await page.click('#input-type-url');
    
    // URL input should now be visible, text input hidden
    const urlVisible = await page.evaluate(() => {
      const urlInput = document.getElementById('url-input');
      const contentInput = document.getElementById('content-input');
      return !urlInput.classList.contains('hidden') && contentInput.classList.contains('hidden');
    });
    expect(urlVisible).toBe(true);
  });

  test('form submission requires API key', async () => {
    await page.goto('http://localhost:3000');
    
    // Fill form without setting API key
    await page.type('#content', '# Test\n\nTest content');
    await page.click('#generate-btn');
    
    // Should show error
    await page.waitForSelector('#error-display:not(.hidden)');
    const errorMessage = await page.$eval('#error-message', el => el.textContent);
    expect(errorMessage).toContain('API key is required');
  });

  test('form submission requires content', async () => {
    await page.goto('http://localhost:3000');
    
    // Set API key first
    await page.type('#api-key-input', 'test-api-key');
    await page.click('#save-api-key');
    
    // Try to submit without content
    await page.click('#generate-btn');
    
    // Should show error
    await page.waitForSelector('#error-display:not(.hidden)');
    const errorMessage = await page.$eval('#error-message', el => el.textContent);
    expect(errorMessage).toContain('Please enter some content');
  });

  test('complete form submission flow with mock API', async () => {
    await page.goto('http://localhost:3000');
    
    // Set API key
    await page.type('#api-key-input', 'test-api-key');
    await page.click('#save-api-key');
    
    // Fill content
    await page.type('#content', '# Test Episode\n\nThis is test content for the podcast.');
    
    // Mock the API response
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/generate')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            episodeId: 'test-123',
            message: 'Episode generated successfully: "Test Episode"'
          })
        });
      } else {
        request.continue();
      }
    });
    
    // Submit form
    await page.click('#generate-btn');
    
    // Wait for progress to show
    await page.waitForSelector('#generation-progress:not(.hidden)');
    
    // Wait for results
    await page.waitForSelector('#generation-results:not(.hidden)', { timeout: 10000 });
    
    const resultTitle = await page.$eval('#result-title', el => el.textContent);
    expect(resultTitle).toBe('Test Episode');
    
    // Check RSS URL is generated
    const rssUrl = await page.$eval('#rss-url', el => el.value);
    expect(rssUrl).toMatch(/^http:\/\/localhost:3000\/podcast\/[a-f0-9-]+$/);
  });

  test('URL input mode works', async () => {
    await page.goto('http://localhost:3000');
    
    // Set API key
    await page.type('#api-key-input', 'test-api-key');
    await page.click('#save-api-key');
    
    // Switch to URL input
    await page.click('#input-type-url');
    
    // Fill URL
    await page.type('#url', 'https://example.com/test.md');
    
    // Mock the API response
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/generate')) {
        const postData = JSON.parse(request.postData());
        expect(postData.url).toBe('https://example.com/test.md');
        
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            episodeId: 'test-456',
            message: 'Episode generated successfully: "URL Test Episode"'
          })
        });
      } else {
        request.continue();
      }
    });
    
    // Submit form
    await page.click('#generate-btn');
    
    // Wait for results
    await page.waitForSelector('#generation-results:not(.hidden)', { timeout: 10000 });
    
    const resultTitle = await page.$eval('#result-title', el => el.textContent);
    expect(resultTitle).toBe('URL Test Episode');
  });

  test('copy RSS URL functionality', async () => {
    await page.goto('http://localhost:3000');
    
    // Set API key
    await page.type('#api-key-input', 'test-api-key');
    await page.click('#save-api-key');
    
    // Fill content
    await page.type('#content', '# Copy Test\n\nTest content.');
    
    // Mock the API response
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/generate')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            episodeId: 'copy-test',
            message: 'Episode generated successfully: "Copy Test"'
          })
        });
      } else {
        request.continue();
      }
    });
    
    // Submit form and wait for results
    await page.click('#generate-btn');
    await page.waitForSelector('#generation-results:not(.hidden)', { timeout: 10000 });
    
    // Click copy button
    await page.click('#copy-rss-url');
    
    // Check that button text changes to "Copied!"
    const buttonText = await page.$eval('#copy-rss-url', el => el.textContent);
    expect(buttonText).toBe('Copied!');
  });

  test('handles API errors gracefully', async () => {
    await page.goto('http://localhost:3000');
    
    // Set API key
    await page.type('#api-key-input', 'test-api-key');
    await page.click('#save-api-key');
    
    // Fill content
    await page.type('#content', '# Error Test\n\nTest content.');
    
    // Mock API error response
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/generate')) {
        request.respond({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Internal server error'
          })
        });
      } else {
        request.continue();
      }
    });
    
    // Submit form
    await page.click('#generate-btn');
    
    // Wait for error to show
    await page.waitForSelector('#error-display:not(.hidden)');
    
    const errorMessage = await page.$eval('#error-message', el => el.textContent);
    expect(errorMessage).toContain('Internal server error');
    
    // Progress should be hidden
    const isProgressHidden = await page.evaluate(() => {
      const progress = document.getElementById('generation-progress');
      return progress.classList.contains('hidden');
    });
    expect(isProgressHidden).toBe(true);
  });

  test('responds to query parameters', async () => {
    await page.goto('http://localhost:3000?text=Query%20Test%20Content');
    
    // Wait for JavaScript to initialize
    await page.waitForSelector('#content');
    
    // Check that content is pre-filled
    const contentValue = await page.$eval('#content', el => el.value);
    expect(contentValue).toBe('Query Test Content');
    
    // Check that text radio is selected
    const isTextRadioChecked = await page.$eval('#input-type-text', el => el.checked);
    expect(isTextRadioChecked).toBe(true);
  });

  test('mobile responsive design', async () => {
    // Test mobile viewport
    await page.setViewport({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    // Check that the page is still usable on mobile
    const headerExists = await page.$('#api-key-setup');
    expect(headerExists).toBeTruthy();
    
    // Check that form elements are accessible
    const formExists = await page.$('#podcast-form');
    expect(formExists).toBeTruthy();
    
    // Test that buttons are touch-friendly (at least 44px)
    const buttonHeight = await page.$eval('#generate-btn', el => {
      const rect = el.getBoundingClientRect();
      return rect.height;
    });
    expect(buttonHeight).toBeGreaterThanOrEqual(44);
  });
});