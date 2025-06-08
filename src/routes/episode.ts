import { Router } from 'express';
import { StorageService } from '../services/storage-service';
import { logger } from '../utils/logger';

const router = Router();
const storageService = new StorageService();

// Serve individual episode page
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const episode = await storageService.getEpisode(id);

    if (!episode) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Episode Not Found</title></head>
        <body>
          <h1>Episode Not Found</h1>
          <p>The requested episode could not be found.</p>
        </body>
        </html>
      `);
    }

    // Generate simple HTML page for episode
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${episode.title} - Markdown to Podcast</title>
        <meta name="description" content="Episode: ${episode.title}">
      </head>
      <body>
        <h1>${episode.title}</h1>
        <p><strong>Duration:</strong> ${Math.floor(episode.duration / 60)}:${(episode.duration % 60).toString().padStart(2, '0')}</p>
        <p><strong>Created:</strong> ${episode.createdAt.toLocaleDateString()}</p>
        ${episode.sourceUrl ? `<p><strong>Source:</strong> <a href="${episode.sourceUrl}">${episode.sourceUrl}</a></p>` : ''}
        
        <audio controls style="width: 100%; margin: 20px 0;">
          <source src="/audio/${episode.audioPath || episode.fileName}" type="audio/mpeg">
          Your browser does not support the audio element.
        </audio>
        
        <p><a href="/podcast/${process.env['PODCAST_UUID']}">← Back to Podcast Feed</a></p>
      </body>
      </html>
    `;

    return res.send(html);
  } catch (error) {
    logger.error('Error serving episode page:', error);
    return res.status(500).send('Error loading episode');
  }
});

export default router;
