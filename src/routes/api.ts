import { Router } from 'express';
import { authenticateKey, AuthenticatedRequest } from '../middleware/auth';
import { GenerateRequest, GenerateResponse, ProcessedContent } from '../types';
import { ContentProcessor } from '../content-processor';
import { ContentValidator } from '../utils/validation';
import { TTSService } from '../services/tts-service';
import { StorageService } from '../services/storage-service';
import { logger } from '../utils/logger';
import { appConfig } from '../config';

const router = Router();
const contentProcessor = new ContentProcessor();
const ttsService = new TTSService();
const storageService = new StorageService();

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

    // Save episode to storage
    logger.info('Saving episode to storage...');
    const episode = await storageService.createEpisode(
      processedContent,
      audioResult,
      url // source URL if provided
    );

    logger.info(`Episode stored successfully: ${episode.id}`);

    const response: GenerateResponse = {
      success: true,
      episodeId: episode.id,
      message: `Episode generated and stored: "${episode.title}" (${episode.duration}s)`,
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

// Config endpoint to get podcast UUID
router.get('/config', (_req, res) => {
  try {
    res.json({
      podcastUuid: appConfig.podcastUuid,
      baseUrl: appConfig.baseUrl,
    });
  } catch (error: unknown) {
    logger.error('Error getting config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get config',
    });
  }
});

// Get episode by ID
router.get('/episodes/:id', authenticateKey, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const episode = await storageService.getEpisode(id!);

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found',
      });
    }

    return res.json({ episode });
  } catch (error: unknown) {
    logger.error('Error getting episode:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get episode',
    });
  }
});

// List episodes
router.get('/episodes', authenticateKey, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined;
    const episodes = await storageService.listEpisodes(limit);

    return res.json({ episodes });
  } catch (error: unknown) {
    logger.error('Error listing episodes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list episodes',
    });
  }
});

// Get storage statistics
router.get('/stats', authenticateKey, async (_req: AuthenticatedRequest, res) => {
  try {
    const stats = await storageService.getStats();
    return res.json({ stats });
  } catch (error: unknown) {
    logger.error('Error getting stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get storage statistics',
    });
  }
});

// Maintenance endpoint
router.post('/maintenance', authenticateKey, async (_req: AuthenticatedRequest, res) => {
  try {
    const result = await storageService.performMaintenance();
    return res.json({ maintenance: result });
  } catch (error: unknown) {
    logger.error('Error performing maintenance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform maintenance',
    });
  }
});

export default router;
