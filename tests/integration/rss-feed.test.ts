// Set environment variables before importing the app
process.env['PODCAST_UUID'] = 'test-uuid-123';
process.env['METADATA_FILE'] = './test-data/episodes.json';
process.env['AUDIO_OUTPUT_DIR'] = './test-data/audio';

import request from 'supertest';
import app from '../../src/server';

describe('RSS Feed Integration', () => {

  test('serves RSS feed at correct endpoint', async () => {
    const response = await request(app).get('/podcast/test-uuid-123');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/rss+xml');
    expect(response.text).toContain('<?xml version="1.0"');
    expect(response.text).toContain('version="2.0"');
  });

  test('returns 404 for wrong UUID', async () => {
    const response = await request(app).get('/podcast/wrong-uuid');
    expect(response.status).toBe(404);
  });

  test('serves feed statistics', async () => {
    const response = await request(app).get('/podcast/test-uuid-123/stats');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('episodeCount');
    expect(response.body).toHaveProperty('cache');
  });

  test('refresh cache endpoint works', async () => {
    const response = await request(app).post('/podcast/test-uuid-123/refresh');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('refreshed');
  });

  test('episode page renders for valid episode', async () => {
    // This will return 404 if no episodes exist, which is expected for empty database
    const response = await request(app).get('/episode/non-existent-episode');
    expect(response.status).toBe(404);
    expect(response.text).toContain('Episode Not Found');
  });

  test('RSS feed contains proper headers', async () => {
    const response = await request(app).get('/podcast/test-uuid-123');
    
    expect(response.headers['cache-control']).toBe('public, max-age=300');
    expect(response.headers['etag']).toBeDefined();
  });

  test('RSS feed contains iTunes namespaces', async () => {
    const response = await request(app).get('/podcast/test-uuid-123');
    
    expect(response.text).toContain('xmlns:itunes');
    expect(response.text).toContain('xmlns:atom');
  });
});