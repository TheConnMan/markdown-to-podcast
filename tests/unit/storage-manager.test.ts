import { StorageManager } from '../../src/storage-manager';
import { ProcessedContent } from '../../src/types';
import { AudioGenerationResult } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('StorageManager', () => {
  let storageManager: StorageManager;
  const testDataDir = './test-data';
  
  beforeEach(() => {
    // Set up test environment
    process.env['METADATA_FILE'] = path.join(testDataDir, 'episodes.json');
    process.env['AUDIO_OUTPUT_DIR'] = path.join(testDataDir, 'audio');
    process.env['MAX_EPISODES'] = '3';
    
    // Clean up and create test directories
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
    fs.mkdirSync(testDataDir, { recursive: true });
    
    storageManager = new StorageManager();
  });

  afterEach(() => {
    // Clean up test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  test('saves and retrieves episode', async () => {
    const content: ProcessedContent = {
      title: 'Test Episode',
      text: 'Test content',
      sourceType: 'markdown',
    };
    
    const audioResult: AudioGenerationResult = {
      episodeId: 'test-id',
      fileName: 'test-episode.mp3',
      filePath: path.join(testDataDir, 'audio', 'test-episode.mp3'),
      duration: 120,
      fileSize: 1024,
      title: 'Test Episode',
      createdAt: new Date()
    };
    
    // Create mock audio file
    fs.writeFileSync(audioResult.filePath, 'mock audio data');
    
    const episode = await storageManager.saveEpisode(content, audioResult);
    
    expect(episode.id).toBe('test-id');
    expect(episode.title).toBe('Test Episode');
    expect(episode.duration).toBe(120);
    
    const retrieved = await storageManager.getEpisode('test-id');
    expect(retrieved).toEqual(episode);
  });

  test('cleans up old episodes when limit exceeded', async () => {
    // Create 4 episodes (limit is 3)
    for (let i = 1; i <= 4; i++) {
      const content: ProcessedContent = {
        title: `Episode ${i}`,
        text: 'Test content',
        sourceType: 'markdown',
      };
      
      const audioResult: AudioGenerationResult = {
        episodeId: `episode-${i}`,
        fileName: `episode-${i}.mp3`,
        filePath: path.join(testDataDir, 'audio', `episode-${i}.mp3`),
        duration: 120,
        fileSize: 1024,
        title: `Episode ${i}`,
        createdAt: new Date()
      };
      
      fs.writeFileSync(audioResult.filePath, 'mock audio data');
      await storageManager.saveEpisode(content, audioResult);
    }
    
    const episodes = await storageManager.getAllEpisodes();
    expect(episodes.length).toBe(3); // Should be limited to 3
    
    // First episode should be gone
    const firstEpisode = await storageManager.getEpisode('episode-1');
    expect(firstEpisode).toBeNull();
  });

  test('verifies storage integrity', async () => {
    const content: ProcessedContent = {
      title: 'Test Episode',
      text: 'Test content',
      sourceType: 'markdown',
    };
    
    const audioResult: AudioGenerationResult = {
      episodeId: 'test-id',
      fileName: 'test-episode.mp3',
      filePath: path.join(testDataDir, 'audio', 'test-episode.mp3'),
      duration: 120,
      fileSize: 1024,
      title: 'Test Episode',
      createdAt: new Date()
    };
    
    // Create mock audio file first
    fs.writeFileSync(audioResult.filePath, 'mock audio data');
    await storageManager.saveEpisode(content, audioResult);
    
    // Delete audio file to create integrity issue
    fs.unlinkSync(audioResult.filePath);
    
    const integrity = await storageManager.verifyIntegrity();
    expect(integrity.valid).toBe(false);
    expect(integrity.missingFiles).toContain('test-episode.mp3');
  });

  test('handles orphaned files', async () => {
    // Create orphaned file
    const orphanedFilePath = path.join(testDataDir, 'audio', 'orphaned.mp3');
    fs.writeFileSync(orphanedFilePath, 'orphaned audio data');
    
    const integrity = await storageManager.verifyIntegrity();
    expect(integrity.valid).toBe(false);
    expect(integrity.orphanedFiles).toContain('orphaned.mp3');
    
    const cleaned = await storageManager.cleanupOrphanedFiles();
    expect(cleaned).toBe(1);
    
    // File should be removed
    expect(fs.existsSync(orphanedFilePath)).toBe(false);
  });

  test('calculates storage stats correctly', async () => {
    const content: ProcessedContent = {
      title: 'Test Episode',
      text: 'Test content',
      sourceType: 'markdown',
    };
    
    const audioResult: AudioGenerationResult = {
      episodeId: 'test-id',
      fileName: 'test-episode.mp3',
      filePath: path.join(testDataDir, 'audio', 'test-episode.mp3'),
      duration: 120,
      fileSize: 1024,
      title: 'Test Episode',
      createdAt: new Date()
    };
    
    fs.writeFileSync(audioResult.filePath, 'mock audio data');
    await storageManager.saveEpisode(content, audioResult);
    
    const stats = await storageManager.getStorageStats();
    expect(stats.totalEpisodes).toBe(1);
    expect(stats.totalDuration).toBe(120);
    expect(stats.totalSize).toBe(1024);
    expect(stats.newestEpisode).toBeTruthy();
    expect(stats.oldestEpisode).toBeTruthy();
  });

  test('deletes episode and audio file', async () => {
    const content: ProcessedContent = {
      title: 'Test Episode',
      text: 'Test content',
      sourceType: 'markdown',
    };
    
    const audioResult: AudioGenerationResult = {
      episodeId: 'test-id',
      fileName: 'test-episode.mp3',
      filePath: path.join(testDataDir, 'audio', 'test-episode.mp3'),
      duration: 120,
      fileSize: 1024,
      title: 'Test Episode',
      createdAt: new Date()
    };
    
    fs.writeFileSync(audioResult.filePath, 'mock audio data');
    await storageManager.saveEpisode(content, audioResult);
    
    const deleted = await storageManager.deleteEpisode('test-id');
    expect(deleted).toBe(true);
    
    const retrieved = await storageManager.getEpisode('test-id');
    expect(retrieved).toBeNull();
    
    expect(fs.existsSync(audioResult.filePath)).toBe(false);
  });
});