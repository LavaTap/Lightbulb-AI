import { createApp } from './app.js';
import { getDatabase, closeDatabase } from './database.js';

const PORT = parseInt(process.env.PORT || '3001');

async function start() {
  const app = createApp();
  await getDatabase();

  const server = app.listen(PORT, () => {
    console.log(`AI Character Chat Backend running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });

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
