import { Router } from 'express';
import { logger } from '../utils/logger';
import { authenticateKey } from '../middleware/auth';

const router = Router();

// Debug GET handler
router.get('/', (_req, res) => {
  res.json({ message: 'Share endpoint is working. Use POST to share content.' });
});

router.post('/', authenticateKey, (req, res) => {
  try {
    const { url, text, title } = req.body as { url?: string; text?: string; title?: string };

    const params = new URLSearchParams();
    if (url) params.set('url', String(url));
    if (text) params.set('text', String(text));
    if (title) params.set('title', String(title));

    res.redirect(`/?${params.toString()}`);
  } catch (error) {
    logger.error('Error handling share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle share',
    });
  }
});

export default router;
