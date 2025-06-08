import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const audioDir = process.env['AUDIO_OUTPUT_DIR'] || './data/audio';
    const filePath = path.join(audioDir, filename);

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: 'Invalid filename' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Audio file not found' });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return;
  } catch (error) {
    console.error('Error serving audio file:', error);
    return res.status(500).json({ message: 'Failed to serve audio file' });
  }
});

export default router;
