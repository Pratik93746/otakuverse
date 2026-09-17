const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      console.error('FATAL: MONGO_URI environment variable is not defined.');
      process.exit(1);
    }

    const connectionOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: process.env.NODE_ENV !== 'production'
    };

    const conn = await mongoose.connect(mongoUri, connectionOptions);

    console.log(`[MongoDB] Database connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB] Connection runtime error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Connection lost. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Connection re-established.');
    });

    return conn;
  } catch (error) {
    console.error(`[MongoDB] Fatal connection failure: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
