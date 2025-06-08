import { Router } from 'express';
import { authenticateKey, AuthenticatedRequest } from '../middleware/auth';
import { StorageService } from '../services/storage-service';

const router = Router();
const storageService = new StorageService();

// Get episode by ID
router.get('/episodes/:id', authenticateKey, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const episode = await storageService.getEpisode(id);
    
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found',
      });
    }
    
    res.json({ episode });
  } catch (error) {
    console.error('Error getting episode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get episode',
    });
  }
});

// List episodes
router.get('/episodes', authenticateKey, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const episodes = await storageService.listEpisodes(limit);
    
    res.json({ episodes });
  } catch (error) {
    console.error('Error listing episodes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list episodes',
    });
  }
});

// Get storage statistics
router.get('/stats', authenticateKey, async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await storageService.getStats();
    res.json({ stats });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get storage statistics',
    });
  }
});

// Maintenance endpoint
router.post('/maintenance', authenticateKey, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await storageService.performMaintenance();
    res.json({ maintenance: result });
  } catch (error) {
    console.error('Error performing maintenance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform maintenance',
    });
  }
});

export default router;