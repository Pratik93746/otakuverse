const mongoose = require('mongoose');
const env = require('./env');

let isShuttingDown = false;

const connectDatabase = async () => {
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

  try {
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
    console.error(`❌ [MongoDB Atlas] Fatal connection failure: ${error.message}`);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null;
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
