import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error(`Error ${statusCode}: ${message}`);
  logger.error(err.stack);

  res.status(statusCode).json({
    success: false,
    message: process.env['NODE_ENV'] === 'production' ? 'Internal server error' : message,
  });
}
