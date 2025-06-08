import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { appConfig } from './config';
import { HealthStatus } from './types';
import packageJson from '../package.json';
import { requestLogger } from './middleware/logging';
import { errorHandler } from './middleware/error';
import { logger } from './utils/logger';

import apiRoutes from './routes/api';
import shareRoutes from './routes/share';
import podcastRoutes from './routes/podcast';
import audioRoutes from './routes/audio';
import episodeRoutes from './routes/episode';

const app = express();

app.use(requestLogger);
app.use(helmet({
  contentSecurityPolicy: process.env['NODE_ENV'] === 'development' ? false : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(compression());

if (process.env['NODE_ENV'] === 'development') {
  app.use(cors());
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure JSON responses for API routes
app.use('/api', (_req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', apiRoutes);
app.use('/share', shareRoutes);
app.use('/podcast', podcastRoutes);
app.use('/audio', audioRoutes);
app.use('/episode', episodeRoutes);

app.get('/health', (_req, res) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: packageJson.version,
    environment: appConfig.nodeEnv,
  };
  res.json(health);
});

app.get('/', (_req, res) => {
  res.sendFile('index.html', { root: './public' });
});

app.use('*', (_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

const startServer = () => {
  const server = app.listen(appConfig.port, () => {
    logger.info(`Server running on port ${appConfig.port} in ${appConfig.nodeEnv} mode`);
  });

  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Graceful shutdown...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return server;
};

if (require.main === module) {
  startServer();
}

export default app;