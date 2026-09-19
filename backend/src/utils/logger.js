const env = require('../config/env');

/**
 * Minimal structured logger satisfying Section 22
 * Never logs passwords, tokens, API secrets or full auth credentials
 */
const redactSensitiveData = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = { ...obj };
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'key', 'razorpay_signature', 'credential'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = redactSensitiveData(sanitized[key]);
    }
  }
  return sanitized;
};

const logger = {
  info: (message, meta = null) => {
    if (meta) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, redactSensitiveData(meta));
    } else {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
    }
  },
  warn: (message, meta = null) => {
    if (meta) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, redactSensitiveData(meta));
    } else {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    }
  },
  error: (message, error = null) => {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: env.NODE_ENV !== 'production' ? error.stack : undefined }
      : error;
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, redactSensitiveData(errorDetails));
  },
};

module.exports = logger;
