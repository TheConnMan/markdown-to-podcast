import { TTSService } from '../../src/services/tts-service';
import { ProcessedContent } from '../../src/types';

describe('Audio Generation Integration', () => {
  let ttsService: TTSService;

  beforeEach(() => {
    // Mock the output directory to a test location
    process.env['AUDIO_OUTPUT_DIR'] = './test-audio';
    ttsService = new TTSService();
  });

  test('validates ElevenLabs authentication', async () => {
    // Temporarily remove API key
    const originalKey = process.env['ELEVENLABS_API_KEY'];
    delete process.env['ELEVENLABS_API_KEY'];

    const testContent: ProcessedContent = {
      title: 'Test',
      text: 'Test content',
      sourceType: 'markdown',
    };

    await expect(ttsService.generateEpisodeAudio(testContent)).rejects.toThrow('ELEVENLABS_API_KEY');

    // Restore API key
    if (originalKey) {
      process.env['ELEVENLABS_API_KEY'] = originalKey;
    }
  });

  test('estimates costs correctly', () => {
    const cost = ttsService.estimateCost(1000, 'turbo');
    expect(cost).toBeCloseTo(0.18, 2); // 1000 chars * $0.18/1K chars
  });

  test('gets available voices', () => {
    const voices = ttsService.getAvailableVoices();
    expect(voices).toContain('chris');
    expect(voices).toContain('adam');
    expect(voices).toContain('rachel');
    // Legacy presets should still work
    expect(voices).toContain('neutral-wavenet');
    expect(voices).toContain('male-neural');
  });

  test('handles invalid voice preset', async () => {
    // Set up valid API key for this test to avoid auth error
    process.env['ELEVENLABS_API_KEY'] = 'test-elevenlabs-api-key-12345678901234567890';

    const testContent: ProcessedContent = {
      title: 'Test',
      text: 'Test content',
      sourceType: 'markdown',
    };

    await expect(ttsService.generateEpisodeAudio(testContent, 'invalid-voice')).rejects.toThrow('Unknown voice preset');
  });
});
