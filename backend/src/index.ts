import dotenv from 'dotenv';
import { createApp } from './app.js';
import { getDatabase, closeDatabase } from './database.js';
import { initLance } from './services/lanceService.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001');

async function start() {
  const app = createApp();
  
  // Initialize database on startup
  await getDatabase();

  // Initialize LanceDB (optional - graceful degradation)
  try {
    await initLance();
  } catch (e) {
    console.warn('LanceDB not available, chat memory features disabled');
  }
  
  const server = app.listen(PORT, () => {
    console.log(`Lightbulb AI Backend running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
  
  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down gracefully');
    server.close(() => {
      closeDatabase();
      console.log('Server closed');
      process.exit(0);
    });
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
