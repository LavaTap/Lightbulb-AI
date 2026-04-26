import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import generateRoutes from './routes/generate.js';
import recordsRoutes from './routes/records.js';
import modelConfigsRoutes from './routes/modelConfigs.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
  });

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/health', (req, res) => {
    console.log('[Health Check] OK');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api', generateRoutes);
  app.use('/api/records', recordsRoutes);
  app.use('/api/model-configs', modelConfigsRoutes);

  // Error handler
  app.use(errorHandler);

  return app;
}
