const app = require('./app');
const env = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const logger = require('./utils/logger');

let server;

const startServer = async () => {
  // Connect to MongoDB Atlas (Section 37)
  await connectDatabase();

  server = app.listen(env.PORT, () => {
    logger.info(`Server initialized in ${env.NODE_ENV} mode on port ${env.PORT}`);
    logger.info(`CORS configured for frontend origin: ${env.CLIENT_URL}`);
  });

  // Return stock held by unpaid online orders whose payment window has passed.
  const orderService = require('./services/order.service');
  const sweep = setInterval(() => {
    orderService.releaseExpiredReservations(200).catch((e) => logger.error('Reservation sweep failed:', e));
  }, 5 * 60 * 1000);
  sweep.unref();

  // Graceful Shutdown Handlers (Section 36)
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Initiating graceful shutdown...`);

    if (server) {
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await disconnectDatabase();
          logger.info('Graceful shutdown completed successfully.');
          process.exit(0);
        } catch (dbErr) {
          logger.error('Error during database disconnect:', dbErr);
          process.exit(1);
        }
      });

      // Force terminate if graceful shutdown hangs
      setTimeout(() => {
        logger.error('Forceful shutdown timeout reached (10s). Terminating process.');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

startServer();
