import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  authenticated?: boolean;
}

export function authenticateKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env['API_KEY'];

  if (!expectedKey) {
    res.status(500).json({
      success: false,
      message: 'Server configuration error',
    });
    return;
  }

  if (!apiKey || apiKey !== expectedKey) {
    res.status(401).json({
      success: false,
      message: 'Invalid or missing API key',
    });
    return;
  }

  req.authenticated = true;
  next();
}
