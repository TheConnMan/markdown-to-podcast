import request from 'supertest';
import app from '../../src/server';

describe('Basic Server Setup', () => {
  test('health endpoint returns 200', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.version).toBe('0.1.0');
  });

  test('serves static index.html', async () => {
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('Markdown to Podcast');
  });

  test('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/nonexistent');
    
    expect(response.status).toBe(404);
  });
});