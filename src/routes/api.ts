import { Router } from 'express';
import { authenticateKey } from '../middleware/auth';
import { GenerateRequest, GenerateResponse, ProcessedContent } from '../types';
import { ContentProcessor } from '../content-processor';
import { ContentValidator } from '../utils/validation';

const router = Router();
const contentProcessor = new ContentProcessor();

router.post(
  '/generate',
  authenticateKey,
  async (req, res) => {
  try {
    const { content, url } = req.body as GenerateRequest;

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

    // TODO: Pass to audio generation (Task 05)
    console.log(
      `Processed content: "${processedContent.title}" (${processedContent.wordCount} words)`
    );

    const response: GenerateResponse = {
      success: true,
      episodeId: 'placeholder-id',
      message: `Content processed successfully: "${processedContent.title}"`,
    };

    return res.json(response);
  } catch (error: unknown) {
    console.error('Error processing content:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process content',
    });
  }
});

export default router;
