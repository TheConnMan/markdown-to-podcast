import { StorageService } from '../../src/services/storage-service';
import { ProcessedContent } from '../../src/types';
import { AudioGenerationResult } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('Storage Integration', () => {
  let storageService: StorageService;
  const testDataDir = './test-integration-data';

  beforeEach(() => {
    // Set up test environment
    process.env['METADATA_FILE'] = path.join(testDataDir, 'episodes.json');
    process.env['AUDIO_OUTPUT_DIR'] = path.join(testDataDir, 'audio');
    process.env['MAX_EPISODES'] = '5';
    
    // Clean up and create test directories
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
    fs.mkdirSync(testDataDir, { recursive: true });
    
    storageService = new StorageService();
  });

  afterEach(() => {
    // Clean up test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  test('full episode creation workflow', async () => {
    const content: ProcessedContent = {
      title: 'Integration Test Episode',
      text: 'This is an integration test episode',
      sourceType: 'markdown',
    };
    
    const audioResult: AudioGenerationResult = {
      episodeId: 'integration-test',
      fileName: 'integration-test.mp3',
      filePath: path.join(testDataDir, 'audio', 'integration-test.mp3'),
      duration: 180,
      fileSize: 2048,
      title: 'Integration Test Episode',
      createdAt: new Date()
    };
    
    // Create mock audio file
    fs.writeFileSync(audioResult.filePath, 'mock integration audio data');
    
    const episode = await storageService.createEpisode(content, audioResult);
    
    expect(episode.id).toBe('integration-test');
    expect(episode.title).toBe('Integration Test Episode');
    
    const stats = await storageService.getStats();
    expect(stats.totalEpisodes).toBe(1);
    expect(stats.totalDuration).toBe(180);
    expect(stats.averageEpisodeDuration).toBe(180);
    expect(stats.averageFileSize).toBe(2048);
  });

  test('episode listing and retrieval', async () => {
    // Create multiple episodes
    for (let i = 1; i <= 3; i++) {
      const content: ProcessedContent = {
        title: `Episode ${i}`,
        text: `Content for episode ${i}`,
        sourceType: 'markdown',
      };
      
      const audioResult: AudioGenerationResult = {
        episodeId: `episode-${i}`,
        fileName: `episode-${i}.mp3`,
        filePath: path.join(testDataDir, 'audio', `episode-${i}.mp3`),
        duration: 120 + i * 10,
        fileSize: 1024 * i,
        title: `Episode ${i}`,
        createdAt: new Date(Date.now() + i * 1000) // Slight time difference
      };
      
      fs.writeFileSync(audioResult.filePath, `mock audio data ${i}`);
      await storageService.createEpisode(content, audioResult);
    }
    
    // Test listing all episodes
    const allEpisodes = await storageService.listEpisodes();
    expect(allEpisodes.length).toBe(3);
    
    // Episodes should be ordered by creation date (newest first)
    expect(allEpisodes[0]!.title).toBe('Episode 3');
    expect(allEpisodes[2]!.title).toBe('Episode 1');
    
    // Test listing with limit
    const limitedEpisodes = await storageService.listEpisodes(2);
    expect(limitedEpisodes.length).toBe(2);
    
    // Test individual episode retrieval
    const episode2 = await storageService.getEpisode('episode-2');
    expect(episode2).toBeTruthy();
    expect(episode2!.title).toBe('Episode 2');
    
    // Test non-existent episode
    const nonExistent = await storageService.getEpisode('non-existent');
    expect(nonExistent).toBeNull();
  });

  test('storage maintenance workflow', async () => {
    // Create episode
    const content: ProcessedContent = {
      title: 'Maintenance Test Episode',
      text: 'Content for maintenance test',
      sourceType: 'markdown',
    };
    
    const audioResult: AudioGenerationResult = {
      episodeId: 'maintenance-test',
      fileName: 'maintenance-test.mp3',
      filePath: path.join(testDataDir, 'audio', 'maintenance-test.mp3'),
      duration: 200,
      fileSize: 3072,
      title: 'Maintenance Test Episode',
      createdAt: new Date()
    };
    
    fs.writeFileSync(audioResult.filePath, 'mock maintenance audio data');
    await storageService.createEpisode(content, audioResult);
    
    // Create orphaned file
    const orphanedPath = path.join(testDataDir, 'audio', 'orphaned.mp3');
    fs.writeFileSync(orphanedPath, 'orphaned data');
    
    // Run maintenance
    const maintenanceResult = await storageService.performMaintenance();
    
    expect(maintenanceResult.orphanedFilesRemoved).toBe(1);
    expect(maintenanceResult.integrityValid).toBe(true);
    expect(maintenanceResult.issues.length).toBe(0);
    
    // Orphaned file should be gone
    expect(fs.existsSync(orphanedPath)).toBe(false);
  });

  test('episode deletion workflow', async () => {
    const content: ProcessedContent = {
      title: 'Delete Test Episode',
      text: 'Content for delete test',
      sourceType: 'markdown',
    };
    
    const audioResult: AudioGenerationResult = {
      episodeId: 'delete-test',
      fileName: 'delete-test.mp3',
      filePath: path.join(testDataDir, 'audio', 'delete-test.mp3'),
      duration: 150,
      fileSize: 1536,
      title: 'Delete Test Episode',
      createdAt: new Date()
    };
    
    fs.writeFileSync(audioResult.filePath, 'mock delete test audio data');
    const episode = await storageService.createEpisode(content, audioResult);
    
    // Verify episode exists
    const retrieved = await storageService.getEpisode(episode.id);
    expect(retrieved).toBeTruthy();
    expect(fs.existsSync(audioResult.filePath)).toBe(true);
    
    // Delete episode
    const deleted = await storageService.deleteEpisode(episode.id);
    expect(deleted).toBe(true);
    
    // Verify episode and file are gone
    const retrievedAfterDelete = await storageService.getEpisode(episode.id);
    expect(retrievedAfterDelete).toBeNull();
    expect(fs.existsSync(audioResult.filePath)).toBe(false);
  });

  test('storage statistics calculation', async () => {
    // Start with empty storage
    let stats = await storageService.getStats();
    expect(stats.totalEpisodes).toBe(0);
    expect(stats.totalDuration).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.averageEpisodeDuration).toBe(0);
    expect(stats.averageFileSize).toBe(0);
    
    // Create episodes with different durations and sizes
    const episodeData = [
      { duration: 100, size: 1000 },
      { duration: 200, size: 2000 },
      { duration: 300, size: 3000 }
    ];
    
    for (let i = 0; i < episodeData.length; i++) {
      const { duration, size } = episodeData[i]!;
      const content: ProcessedContent = {
        title: `Stats Episode ${i + 1}`,
        text: `Content ${i + 1}`,
        sourceType: 'markdown',
      };
      
      const audioResult: AudioGenerationResult = {
        episodeId: `stats-${i + 1}`,
        fileName: `stats-${i + 1}.mp3`,
        filePath: path.join(testDataDir, 'audio', `stats-${i + 1}.mp3`),
        duration,
        fileSize: size,
        title: `Stats Episode ${i + 1}`,
        createdAt: new Date(Date.now() + i * 1000)
      };
      
      fs.writeFileSync(audioResult.filePath, `stats data ${i + 1}`);
      await storageService.createEpisode(content, audioResult);
    }
    
    // Check final stats
    stats = await storageService.getStats();
    expect(stats.totalEpisodes).toBe(3);
    expect(stats.totalDuration).toBe(600); // 100 + 200 + 300
    expect(stats.totalSize).toBe(6000); // 1000 + 2000 + 3000
    expect(stats.averageEpisodeDuration).toBe(200); // 600 / 3
    expect(stats.averageFileSize).toBe(2000); // 6000 / 3
    expect(stats.oldestEpisode).toBeTruthy();
    expect(stats.newestEpisode).toBeTruthy();
  });
});