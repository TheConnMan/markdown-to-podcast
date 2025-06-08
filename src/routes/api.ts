import { Router } from 'express';
import { authenticateKey } from '../middleware/auth';
import { GenerateRequest, GenerateResponse } from '../types';

const router = Router();

router.post('/generate', authenticateKey, async (req, res) => {
  try {
    const { content, url }: GenerateRequest = req.body;

    if (!content && !url) {
      return res.status(400).json({
        success: false,
        message: 'Either content or url must be provided',
      });
    }

    const response: GenerateResponse = {
      success: true,
      episodeId: 'placeholder-id',
      message: 'Episode generation started (placeholder)',
    };

    return res.json(response);
  } catch (error) {
    console.error('Error generating episode:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate episode',
    });
  }
});

export default router;