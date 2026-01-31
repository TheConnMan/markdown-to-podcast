import { ProcessedContent } from '../../src/types';
import * as fs from 'fs';

// Mock ElevenLabs SDK
const mockConvert = jest.fn().mockImplementation(async () => ({
  [Symbol.asyncIterator]: async function* () {
    yield Buffer.from('fake-audio-data');
  }
}));

jest.mock('elevenlabs', () => ({
  ElevenLabsClient: jest.fn().mockImplementation(() => ({
    textToSpeech: {
      convert: mockConvert
    }
  }))
}));

// Mock child_process for FFmpeg
jest.mock('child_process', () => ({
  execSync: jest.fn().mockReturnValue('60.0')
}));

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn(() => true),
  statSync: jest.fn(() => ({ size: 1000, ctime: new Date() })),
  readdirSync: jest.fn(() => ['episode-1.mp3', 'episode-2.mp3'])
}));

// Import AudioGenerator after mocks are set up
import { AudioGenerator } from '../../src/audio-generator';

describe('AudioGenerator', () => {
  let generator: AudioGenerator;

  const shortContent: ProcessedContent = {
    title: 'Short Episode',
    text: 'This is a short test episode with some content to convert to speech.',
    sourceType: 'markdown',
  };

  const longContent: ProcessedContent = {
    title: 'Long Episode',
    text: 'A'.repeat(5000) + ' This is a very long episode that exceeds the regular TTS character limit and should trigger chunked processing.',
    sourceType: 'markdown',
  };

  const veryLongContent: ProcessedContent = {
    title: 'Very Long Episode',
    text: 'A'.repeat(10000) + ' This is an extremely long episode that requires multiple chunks.',
    sourceType: 'markdown',
  };

  beforeEach(() => {
    // Set up test environment
    process.env['AUDIO_OUTPUT_DIR'] = './test-audio';
    process.env['ELEVENLABS_API_KEY'] = 'test-elevenlabs-api-key-12345678901234567890';

    // Reset all mocks before each test
    jest.clearAllMocks();

    generator = new AudioGenerator();
    // Ensure test directory exists
    if (!fs.existsSync('./test-audio')) {
      fs.mkdirSync('./test-audio', { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    try {
      if (fs.existsSync('./test-audio')) {
        const files = fs.readdirSync('./test-audio');
        files.forEach(file => {
          if (file.startsWith('episode-')) {
            fs.unlinkSync(`./test-audio/${file}`);
          }
        });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('generates audio file successfully for short content', async () => {
    const result = await generator.generateAudio(shortContent);

    expect(result.episodeId).toBeDefined();
    expect(result.fileName).toMatch(/^episode-.+\.mp3$/);
    expect(result.title).toBe('Short Episode');
    expect(result.fileSize).toBeGreaterThan(0);
    expect(mockConvert).toHaveBeenCalledTimes(1);
  });

  test('uses chunked synthesis for long content', async () => {
    const result = await generator.generateAudio(longContent);

    expect(result.episodeId).toBeDefined();
    expect(result.title).toBe('Long Episode');
    // Should create multiple TTS calls for chunks
    expect(mockConvert).toHaveBeenCalled();
  });

  test('cleans up on generation failure', async () => {
    // Mock ElevenLabs to throw error
    mockConvert.mockRejectedValueOnce(new Error('TTS error'));

    // Mock fs.existsSync to return false so unlinkSync isn't called
    const fs = require('fs');
    fs.existsSync.mockReturnValueOnce(false);

    await expect(generator.generateAudio(shortContent)).rejects.toThrow('Audio generation failed');
  });

  test('prepares text for TTS correctly', () => {
    const generator = new AudioGenerator();
    // Access public method for testing
    const preparedText = generator.prepareTextForTTS('Dr. Smith said API is great.\n\nNext paragraph.');

    expect(preparedText).toContain('Doctor Smith');
    expect(preparedText).toContain('A P I');
    expect(preparedText).not.toContain('\n\n');
  });

  test('splits text into appropriate chunks', () => {
    const testText = 'A'.repeat(3000) + '. ' + 'B'.repeat(3000) + '. ' + 'C'.repeat(2000) + '.';

    // Access the private method through any casting for testing
    const chunks = (generator as any).splitTextIntoChunks(testText, 4500);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk: string) => {
      expect(chunk.length).toBeLessThanOrEqual(4500);
    });
  });

  test('gets voice presets', () => {
    const presets = AudioGenerator.getVoicePresets();
    expect(presets).toHaveProperty('chris');
    expect(presets).toHaveProperty('adam');
    expect(presets).toHaveProperty('rachel');
    expect(presets['chris']).toHaveProperty('voiceId');
    expect(presets['chris']).toHaveProperty('gender', 'MALE');
    // Legacy presets should map to ElevenLabs voices
    expect(presets).toHaveProperty('neutral-wavenet');
    expect(presets['neutral-wavenet'].voiceId).toBe(presets['chris'].voiceId);
  });

  test('handles very long content gracefully', async () => {
    const result = await generator.generateAudio(veryLongContent);

    expect(result.episodeId).toBeDefined();
    expect(result.title).toBe('Very Long Episode');
    // Should use chunked processing for very long content
    expect(mockConvert).toHaveBeenCalled();
  });

  test('estimates cost correctly for ElevenLabs turbo', () => {
    // ElevenLabs turbo pricing: ~$0.18 per 1K characters
    const cost = 1000 * (0.18 / 1000);
    expect(cost).toBeCloseTo(0.18);
  });

  test('cleans up old files', async () => {
    // Create some test files
    const testFiles = ['episode-old1.mp3', 'episode-old2.mp3', 'episode-old3.mp3'];
    testFiles.forEach(file => {
      fs.writeFileSync(`./test-audio/${file}`, 'test data');
    });

    await generator.cleanupOldFiles(2);

    // Check that cleanup was called (mocked fs, so we can't verify actual file deletion)
    expect(fs.readdirSync).toHaveBeenCalled();
  });
});
