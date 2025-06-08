import request from 'supertest';
import express from 'express';
import shareRoutes from '../../src/routes/share';

describe('PWA Share Target', () => {
  const testApiKey = 'test-key-123';
  
  beforeAll(() => {
    process.env['API_KEY'] = testApiKey;
  });
  
  // Create a minimal test app
  const createTestApp = () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/share', shareRoutes);
    return app;
  };

  test('handles share target POST with URL', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/share')
      .set('X-API-Key', testApiKey)
      .send({
        title: 'Shared Article',
        url: 'https://example.com/article',
      });

    expect(response.status).toBe(302); // Redirect
    expect(response.headers['location']).toContain('/?url=');
    expect(response.headers['location']).toContain('https%3A%2F%2Fexample.com%2Farticle');
  });

  test('handles share target POST with text content', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/share')
      .set('X-API-Key', testApiKey)
      .send({
        title: 'Shared Content',
        text: '# Test Article\n\nThis is test content.',
      });

    expect(response.status).toBe(302); // Redirect
    expect(response.headers['location']).toContain('/?text=');
    expect(response.headers['location']).toContain('%23+Test+Article');
  });

  test('handles share target POST with both URL and text', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/share')
      .set('X-API-Key', testApiKey)
      .send({
        title: 'Mixed Content',
        text: 'Some text content',
        url: 'https://example.com/page',
      });

    expect(response.status).toBe(302); // Redirect
    expect(response.headers['location']).toContain('/?url=');
    expect(response.headers['location']).toContain('text=');
  });

  test('requires authentication for share endpoint', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/share')
      .send({
        title: 'Test',
        url: 'https://example.com',
      });

    expect(response.status).toBe(401);
  });

  test('handles empty share target request', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/share')
      .set('X-API-Key', testApiKey)
      .send({});

    expect(response.status).toBe(302); // Should still redirect
    expect(response.headers['location']).toBe('/?');
  });

  test('handles malformed share data gracefully', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/share')
      .set('X-API-Key', testApiKey)
      .send({
        title: null,
        text: undefined,
        url: '',
      });

    expect(response.status).toBe(302); // Should handle gracefully
  });

  test('manifest includes correct share target configuration', () => {
    const manifest = require('../../public/manifest.json');
    
    expect(manifest.share_target).toEqual({
      action: '/share',
      method: 'POST',
      enctype: 'application/x-www-form-urlencoded',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    });
  });

  test('share target accepts form-encoded data', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/share')
      .set('X-API-Key', testApiKey)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('title=Form%20Title&url=https%3A//example.com');

    expect(response.status).toBe(302);
    expect(response.headers['location']).toContain('title=Form+Title');
    expect(response.headers['location']).toContain('url=https%3A%2F%2Fexample.com');
  });
});