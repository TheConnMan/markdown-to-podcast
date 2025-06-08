import { Router } from 'express';
import { RSSService } from '../services/rss-service';
import { logger } from '../utils/logger';

const router = Router();
const rssService = new RSSService();

// Serve RSS feed
router.get('/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const expectedUuid = process.env['PODCAST_UUID'];

    if (!expectedUuid || uuid !== expectedUuid) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    // Generate RSS feed
    const feedXml = await rssService.generatePodcastFeed();

    // Set appropriate headers
    res.set({
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // 5 minutes
      ETag: `"${Buffer.from(feedXml).toString('base64').slice(0, 32)}"`,
    });

    return res.send(feedXml);
  } catch (error) {
    logger.error('Error serving RSS feed:', error);
    return res.status(500).json({ message: 'Failed to generate feed' });
  }
});

// RSS feed statistics endpoint
router.get('/:uuid/stats', async (req, res) => {
  try {
    const { uuid } = req.params;
    const expectedUuid = process.env['PODCAST_UUID'];

    if (!expectedUuid || uuid !== expectedUuid) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    const episodeCount = await rssService.getEpisodeCount();
    const latestEpisode = await rssService.getLatestEpisode();
    const feedStats = rssService.getFeedStats();

    return res.json({
      episodeCount,
      latestEpisode: latestEpisode
        ? {
            id: latestEpisode.id,
            title: latestEpisode.title,
            createdAt: latestEpisode.createdAt,
            duration: latestEpisode.duration,
          }
        : null,
      cache: feedStats,
    });
  } catch (error) {
    logger.error('Error getting feed stats:', error);
    return res.status(500).json({ message: 'Failed to get feed statistics' });
  }
});

// Refresh feed cache
router.post('/:uuid/refresh', async (req, res) => {
  try {
    const { uuid } = req.params;
    const expectedUuid = process.env['PODCAST_UUID'];

    if (!expectedUuid || uuid !== expectedUuid) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    await rssService.refreshCache();

    return res.json({ message: 'Feed cache refreshed successfully' });
  } catch (error) {
    logger.error('Error refreshing feed cache:', error);
    return res.status(500).json({ message: 'Failed to refresh feed cache' });
  }
});

export default router;
