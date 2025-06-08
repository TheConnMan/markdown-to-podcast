import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', (req, res) => {
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
