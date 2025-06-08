import { Router } from 'express';
import { authenticateKey, AuthenticatedRequest } from '../middleware/auth';
import { StorageService } from '../services/storage-service';
import { logger } from '../utils/logger';

const router = Router();
const storageService = new StorageService();

// Get episode by ID
router.get('/episodes/:id', authenticateKey, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params['id'];
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Episode ID is required',
      });
    }

    const episode = await storageService.getEpisode(id);

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found',
      });
    }

    return res.json({ episode });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    logger.error('Error performing maintenance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform maintenance',
    });
  }
});

export default router;
