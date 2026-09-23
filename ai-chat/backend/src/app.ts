import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import characterChatRoutes from './routes/characterChat.js';
import modelConfigsRoutes from './routes/modelConfigs.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Character Chat routes
  app.use('/api/character-chat', characterChatRoutes);
  // Model Configs routes (accessible from character-chat prefix for frontend)
  app.use('/api/character-chat/model-configs', modelConfigsRoutes);

  app.use(errorHandler);

  return app;
}
