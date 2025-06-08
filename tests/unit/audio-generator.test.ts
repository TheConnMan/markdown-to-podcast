import { AudioGenerator } from '../../src/audio-generator';
import { ProcessedContent } from '../../src/types';
import * as fs from 'fs';

// Mock extra-googletts
jest.mock('extra-googletts');

describe('AudioGenerator', () => {
  let generator: AudioGenerator;
  const testContent: ProcessedContent = {
    title: 'Test Episode',
    text: 'This is a test episode with some content to convert to speech.',
    sourceType: 'markdown',
  };

  beforeEach(() => {
    // Mock the output directory to a test location
    process.env['AUDIO_OUTPUT_DIR'] = './test-audio';
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

  test('generates audio file successfully', async () => {
    const result = await generator.generateAudio(testContent);
    
    expect(result.episodeId).toBeDefined();
    expect(result.fileName).toMatch(/^episode-.+\.mp3$/);
    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(result.fileSize).toBeGreaterThan(0);
  });

  test('cleans up on generation failure', async () => {
    // Mock googletts to throw error
    const googletts = require('extra-googletts');
    googletts.mockRejectedValueOnce(new Error('TTS error'));
    
    await expect(generator.generateAudio(testContent)).rejects.toThrow('Audio generation failed');
  });

  test('prepares text for TTS correctly', () => {
    const generator = new AudioGenerator();
    // Access public method for testing
    const preparedText = generator.prepareTextForTTS('Dr. Smith said API is great.\n\nNext paragraph.');
    
    expect(preparedText).toContain('Doctor Smith');
    expect(preparedText).toContain('A P I');
    expect(preparedText).not.toContain('\n\n');
  });

  test('gets voice presets', () => {
    const presets = AudioGenerator.getVoicePresets();
    expect(presets).toHaveProperty('neutral-wavenet');
    expect(presets).toHaveProperty('male-neural');
    expect(presets['neutral-wavenet']).toHaveProperty('gender', 'NEUTRAL');
  });

  test('cleans up old files', async () => {
    // Create some test files
    const testFiles = ['episode-old1.mp3', 'episode-old2.mp3', 'episode-old3.mp3'];
    testFiles.forEach(file => {
      fs.writeFileSync(`./test-audio/${file}`, 'test data');
    });

    await generator.cleanupOldFiles(2);
    
    // Check that only 2 files remain
    const remainingFiles = fs.readdirSync('./test-audio').filter(f => f.endsWith('.mp3'));
    expect(remainingFiles.length).toBeLessThanOrEqual(2);
  });
});