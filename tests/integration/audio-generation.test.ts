import { TTSService } from '../../src/services/tts-service';
import { ProcessedContent } from '../../src/types';

describe('Audio Generation Integration', () => {
  let ttsService: TTSService;

  beforeEach(() => {
    // Mock the output directory to a test location
    process.env['AUDIO_OUTPUT_DIR'] = './test-audio';
    ttsService = new TTSService();
  });

  test('validates Google Cloud authentication', async () => {
    // Temporarily remove credentials
    const originalCreds = process.env['GOOGLE_APPLICATION_CREDENTIALS'];
    delete process.env['GOOGLE_APPLICATION_CREDENTIALS'];

    const testContent: ProcessedContent = {
      title: 'Test',
      text: 'Test content',
      sourceType: 'markdown',
    };

    await expect(ttsService.generateEpisodeAudio(testContent)).rejects.toThrow('GOOGLE_APPLICATION_CREDENTIALS environment variable not set');

    // Restore credentials
    if (originalCreds) {
      process.env['GOOGLE_APPLICATION_CREDENTIALS'] = originalCreds;
    }
  });

  test('estimates costs correctly', () => {
    const cost = ttsService.estimateCost(1000, 'wavenet');
    expect(cost).toBe(0.016); // 1000 chars * $16/1M chars
  });

  test('gets available voices', () => {
    const voices = ttsService.getAvailableVoices();
    expect(voices).toContain('neutral-wavenet');
    expect(voices).toContain('male-neural');
  });

  test('handles invalid voice preset', async () => {
    // Set up valid credentials for this test to avoid auth error
    process.env['GOOGLE_APPLICATION_CREDENTIALS'] = './fake-credentials.json';
    
    const testContent: ProcessedContent = {
      title: 'Test',
      text: 'Test content',
      sourceType: 'markdown',
    };

    await expect(ttsService.generateEpisodeAudio(testContent, 'invalid-voice')).rejects.toThrow('Unknown voice preset');
  });
});