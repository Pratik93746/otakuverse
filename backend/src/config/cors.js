const env = require('./env');

const isProd = env.NODE_ENV === 'production';
const allowedOrigins = [
  env.CLIENT_URL,
  'https://otakuverse.in',
  'https://baka.style',
  // Local development origins are never trusted in production.
  ...(isProd ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000']),
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      callback(null, true);
    } else {
      callback(Object.assign(new Error('Origin not allowed.'), { statusCode: 403, code: 'CORS_BLOCKED' }));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400, // 24 hours preflight cache
};

module.exports = corsOptions;
