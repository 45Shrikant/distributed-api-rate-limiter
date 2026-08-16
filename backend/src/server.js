import app from './app.js';
import { env } from './config/env.js';

// Starts the HTTP server and logs runtime configuration
const startServer = () => {
  const server = app.listen(env.PORT, () => {
    console.log(`=========================================`);
    console.log(` Rate Limiter Backend Service Started   `);
    console.log(` Instance ID : ${env.SERVER_INSTANCE_ID}`);
    console.log(` Environment : ${env.NODE_ENV}`);
    console.log(` Port        : ${env.PORT}`);
    console.log(` Health URL  : http://localhost:${env.PORT}/api/health`);
    console.log(`=========================================`);
  });

  // Graceful shutdown ensures in-flight requests are completed before exiting
  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
