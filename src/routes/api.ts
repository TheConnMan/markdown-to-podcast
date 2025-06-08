import { Router } from 'express';
import { authenticateKey, AuthenticatedRequest } from '../middleware/auth';
import { GenerateRequest, GenerateResponse, ProcessedContent } from '../types';
import { ContentProcessor } from '../content-processor';
import { ContentValidator } from '../utils/validation';
import { TTSService } from '../services/tts-service';
import { logger } from '../utils/logger';

const router = Router();
const contentProcessor = new ContentProcessor();
const ttsService = new TTSService();

router.post('/generate', authenticateKey, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      content,
      url,
      voice = 'neutral-wavenet',
    } = req.body as GenerateRequest & { voice?: string };

    if (!content && !url) {
      return res.status(400).json({
        success: false,
        message: 'Either content or url must be provided',
      });
    }

    let processedContent: ProcessedContent;

    if (url) {
      // Validate URL
      const urlValidation = ContentValidator.validateURL(url);
      if (!urlValidation.valid) {
        return res.status(400).json({
          success: false,
          message: `Invalid URL: ${urlValidation.error}`,
        });
      }

      // Process URL content
      processedContent = await contentProcessor.processContent(url, true);
    } else {
      // Validate content
      const contentValidation = ContentValidator.validateContent(content!);
      if (!contentValidation.valid) {
        return res.status(400).json({
          success: false,
          message: `Invalid content: ${contentValidation.error}`,
        });
      }

      // Process markdown content
      processedContent = await contentProcessor.processContent(content!, false);
    }

    // Add metadata
    processedContent.wordCount = processedContent.text.split(/\s+/).length;
    processedContent.estimatedDuration = ContentValidator.estimateReadingTime(
      processedContent.text
    );

    // Generate audio
    logger.info('Starting audio generation...');
    const audioResult = await ttsService.generateEpisodeAudio(processedContent, voice);

    logger.info(
      `Audio generated: ${audioResult.fileName} (${audioResult.duration}s, ${audioResult.fileSize} bytes)`
    );

    // TODO: Pass to storage management (Task 06)

    const response: GenerateResponse = {
      success: true,
      episodeId: audioResult.episodeId,
      message: `Episode generated successfully: "${processedContent.title}" (${audioResult.duration}s)`,
    };

    return res.json(response);
  } catch (error: unknown) {
    logger.error('Error generating episode:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate episode',
    });
  }
});

// New endpoint to get available voices
router.get('/voices', authenticateKey, (_req: AuthenticatedRequest, res) => {
  try {
    const voices = ttsService.getAvailableVoices();
    res.json({ voices });
  } catch (error: unknown) {
    logger.error('Error getting voices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available voices',
    });
  }
});

export default router;
