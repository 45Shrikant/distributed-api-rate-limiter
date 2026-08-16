import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

// Starts the HTTP server, connects to databases, and logs runtime configuration
const startServer = async () => {
  // Initialize persistent database connection
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`=========================================`);
    console.log(` Rate Limiter Backend Service Started   `);
    console.log(` Instance ID : ${env.SERVER_INSTANCE_ID}`);
    console.log(` Environment : ${env.NODE_ENV}`);
    console.log(` Port        : ${env.PORT}`);
    console.log(` Health URL  : http://localhost:${env.PORT}/api/health`);
    console.log(`=========================================`);
  });

  // Graceful shutdown ensures in-flight requests and DB connections are completed before exiting
  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
