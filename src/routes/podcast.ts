import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

router.get('/:uuid', (req, res) => {
  try {
    const { uuid } = req.params;
    const expectedUuid = process.env['PODCAST_UUID'];

    if (!expectedUuid || uuid !== expectedUuid) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    res.set('Content-Type', 'application/rss+xml');
    return res.send('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"></rss>');
  } catch (error) {
    logger.error('Error serving RSS feed:', error);
    return res.status(500).json({ message: 'Failed to generate feed' });
  }
});

export default router;
