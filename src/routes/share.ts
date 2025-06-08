import { Router } from 'express';
import { authenticateKey } from '../middleware/auth';

const router = Router();

router.post('/', authenticateKey, async (req, res) => {
  try {
    const { url, text, title } = req.body;

    const params = new URLSearchParams();
    if (url) params.set('url', url);
    if (text) params.set('text', text);
    if (title) params.set('title', title);

    res.redirect(`/?${params.toString()}`);
  } catch (error) {
    console.error('Error handling share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle share',
    });
  }
});

export default router;