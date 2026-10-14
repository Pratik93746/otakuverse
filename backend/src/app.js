const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const corsOptions = require('./config/cors');
const { globalLimiter } = require('./middleware/rateLimiter');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Security Headers (Section 19)
app.use(helmet());

// CORS Configuration (Section 19)
app.use(cors(corsOptions));

// Body Parsing with safe size limits and rawBody preservation for webhooks
app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global Rate Limiting
app.use(globalLimiter);

// Health Check Endpoints (Section 35 & 41)
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'otakuverse-backend',
    status: 'ok',
    health: '/health',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// Versioned API Routes (Base: /api/v1 - Section 12)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);

// Backwards Compatibility Aliases
app.use('/api/products', productRoutes);
app.use('/api/payment', paymentRoutes);

// 404 Catch-All
app.use(notFound);

// Centralized Error Handling (Section 21)
app.use(errorHandler);

module.exports = app;
