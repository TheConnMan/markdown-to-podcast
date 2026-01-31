import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// Debug GET handler - also handles GET share targets (some browsers use GET)
router.get('/', (req, res) => {
  const { url, text, title } = req.query as { url?: string; text?: string; title?: string };

  // If we have share data, redirect to main page with params
  if (url || text || title) {
    const params = new URLSearchParams();
    if (url) params.set('url', String(url));
    if (text) params.set('text', String(text));
    if (title) params.set('title', String(title));
    params.set('shared', 'true');

    return res.redirect(`/?${params.toString()}`);
  }

  res.json({ message: 'Share endpoint is working. Use POST to share content.' });
});

// PWA Share Target - NO authentication required
// Android/Chrome sends POST requests directly when sharing to the PWA
// The user will authenticate on the main page before generating
router.post('/', (req, res) => {
  try {
    // Handle both form-urlencoded and JSON bodies
    const url = req.body?.url;
    const text = req.body?.text;
    const title = req.body?.title;

    logger.info('Share target received:', { url, text, title: title?.substring(0, 50) });

    const params = new URLSearchParams();
    if (url) params.set('url', String(url));
    if (text) params.set('text', String(text));
    if (title) params.set('title', String(title));
    params.set('shared', 'true');

    // Redirect to main page with shared content as query params
    res.redirect(303, `/?${params.toString()}`);
  } catch (error) {
    logger.error('Error handling share:', error);
    // Still redirect to main page on error
    res.redirect(303, '/?shared=error');
  }
});

export default router;
