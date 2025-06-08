import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { appConfig } from './config';
import { HealthStatus } from './types';
import packageJson from '../package.json';

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

app.use(express.static('public'));

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

const startServer = () => {
  const server = app.listen(appConfig.port, () => {
    console.log(`Server running on port ${appConfig.port} in ${appConfig.nodeEnv} mode`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Graceful shutdown...`);
    server.close(() => {
      console.log('HTTP server closed.');
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