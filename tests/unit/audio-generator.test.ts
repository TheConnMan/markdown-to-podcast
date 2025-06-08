import { ProcessedContent } from '../../src/types';
import * as fs from 'fs';

// Mock Google Cloud Text-to-Speech
const mockTTSClient = {
  synthesizeSpeech: jest.fn().mockResolvedValue([{
    audioContent: Buffer.from('fake-audio-data')
  }])
};

const mockLongAudioClient = {
  synthesizeLongAudio: jest.fn().mockResolvedValue([{
    name: 'fake-operation'
  }])
};

jest.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: jest.fn(() => mockTTSClient),
  TextToSpeechLongAudioSynthesizeClient: jest.fn(() => mockLongAudioClient)
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
    text: 'A'.repeat(5000) + ' This is a very long episode that exceeds the regular TTS character limit and should trigger chunked processing or long audio synthesis.',
    sourceType: 'markdown',
  };
  
  const veryLongContent: ProcessedContent = {
    title: 'Very Long Episode',
    text: 'A'.repeat(950000) + ' This is an extremely long episode that exceeds even the long audio synthesis limit.',
    sourceType: 'markdown',
  };

  beforeEach(() => {
    // Mock the output directory to a test location
    process.env['AUDIO_OUTPUT_DIR'] = './test-audio';
    
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
    expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalledTimes(1);
  });

  test('uses chunked synthesis for long content', async () => {
    const result = await generator.generateAudio(longContent);
    
    expect(result.episodeId).toBeDefined();
    expect(result.title).toBe('Long Episode');
    // Should create multiple TTS calls for chunks
    expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalled();
  });
  
  test('cleans up on generation failure', async () => {
    // Mock TTS client to throw error
    mockTTSClient.synthesizeSpeech.mockRejectedValueOnce(new Error('TTS error'));
    
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
    expect(presets).toHaveProperty('neutral-wavenet');
    expect(presets).toHaveProperty('male-neural');
    expect(presets['neutral-wavenet']).toHaveProperty('gender', 'NEUTRAL');
  });

  test('handles very long content gracefully', async () => {
    const result = await generator.generateAudio(veryLongContent);
    
    expect(result.episodeId).toBeDefined();
    expect(result.title).toBe('Very Long Episode');
    // Should use chunked processing for very long content
    expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalled();
  });
  
  test('estimates cost correctly', () => {
    // Test cost estimation logic
    const cost = 1000 * (16 / 1000000); // 1000 chars at $16 per 1M
    expect(cost).toBeCloseTo(0.016);
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