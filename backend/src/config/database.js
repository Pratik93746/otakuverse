const mongoose = require('mongoose');
const env = require('./env');

let isShuttingDown = false;

const connectDatabase = async () => {
  isShuttingDown = false;
  const mongoUri = env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ [Database] FATAL: MONGODB_URI / MONGO_URI is not configured in environment.');
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null;
  }

  const connectionOptions = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: env.NODE_ENV !== 'production',
  };

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const conn = await mongoose.connect(mongoUri, connectionOptions);
      console.log(`✅ [MongoDB Atlas] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

      mongoose.connection.on('error', (err) => {
        console.error(`❌ [MongoDB Atlas] Runtime connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        if (!isShuttingDown && env.NODE_ENV !== 'production') {
          console.debug('⚠️ [MongoDB Atlas] Idle connection cycle.');
        }
      });

      mongoose.connection.on('reconnected', () => {
        if (!isShuttingDown && env.NODE_ENV !== 'production') {
          console.debug('✅ [MongoDB Atlas] Connection refreshed.');
        }
      });

      return conn;
    } catch (error) {
      console.warn(`⚠️ [MongoDB Atlas] Connection attempt ${attempts}/${maxAttempts} failed: ${error.message}`);
      if (attempts >= maxAttempts) {
        console.error(`❌ [MongoDB Atlas] Fatal connection failure after ${maxAttempts} attempts: ${error.message}`);
        if (env.NODE_ENV === 'production') {
          process.exit(1);
        }
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempts));
    }
  }
};

const disconnectDatabase = async () => {
  isShuttingDown = true;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('🔒 [MongoDB Atlas] Connection closed gracefully.');
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
