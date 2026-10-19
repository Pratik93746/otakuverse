const env = require('../config/env');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled Error: ${err.message}`, err);

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  const response = {
    success: false,
    error: {
      code,
      message: statusCode >= 500 && env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message || 'Internal Server Error',
    },
  };

  if (env.NODE_ENV !== 'production' && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
