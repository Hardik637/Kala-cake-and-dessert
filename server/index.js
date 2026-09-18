require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const brandConfig = require('./config/brand.config');
const dbService = require('./services/dbService');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// 1. PRODUCTION STARTUP VALIDATION (Requirement 27 & 34)
// ---------------------------------------------------------------------------
const jwtSecret = process.env.JWT_SECRET;
if (isProduction) {
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('dev_jwt_secret') || jwtSecret.includes('super_secret_key')) {
    console.error('FATAL CONFIGURATION ERROR: In production, JWT_SECRET must be set in environment variables to a cryptographically strong secret of at least 32 characters.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 2. SECURITY HEADERS & CORS (Requirement 27 & 28)
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://accounts.google.com/gsi/client", "https://checkout.razorpay.com", "'unsafe-inline'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https://accounts.google.com/gsi/", "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
        frameSrc: ["https://accounts.google.com/gsi/", "https://api.razorpay.com"],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : isProduction
  ? ['https://kaladesserts.in']
  : ['http://localhost:5000', 'http://localhost:5173', 'http://127.0.0.1:5000', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || !isProduction || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin blocked by CORS policy.'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json({
  limit: '5mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Request Logger (Development / Diagnostics)
if (!isProduction || process.env.ENABLE_REQUEST_LOGGING === 'true') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
    next();
  });
}

// ---------------------------------------------------------------------------
// 3. RATE LIMITERS (Requirement 27)
// ---------------------------------------------------------------------------
// Owner Login: 5 attempts per 15 minutes
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many owner login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Google Auth: 20 per 15 minutes
const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Order Creation: 15 per 15 minutes
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Order submission rate limit exceeded. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enquiries: 10 per 15 minutes
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Custom enquiry limit reached. Please contact our boutique directly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public Tracking: 60 lookups per 15 minutes anti-abuse limit
const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Tracking lookup limit exceeded. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// 4. API ROUTES
// ---------------------------------------------------------------------------
app.use('/api/admin/login', adminLoginLimiter);
app.use('/api/auth/google', googleAuthLimiter);
app.use('/api/orders/track', trackingLimiter);
app.use('/api/orders', (req, res, next) => {
  if (req.method === 'POST') return orderLimiter(req, res, next);
  next();
});
app.use('/api/enquiries', (req, res, next) => {
  if (req.method === 'POST') return enquiryLimiter(req, res, next);
  next();
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/rewards', require('./routes/reward.routes'));
app.use('/api/enquiries', require('./routes/enquiry.routes'));
app.use('/api/settings', require('./routes/settings.routes'));

// Health Check (Strict zero silent fallback - reports Firestore connectivity)
app.get('/api/health', async (req, res) => {
  try {
    const health = await dbService.checkHealth();
    if (health.connected) {
      return res.status(200).json({
        status: 'OK',
        database: 'connected',
        engine: 'Google Cloud Firestore',
        brand: health.brand || brandConfig.BRAND_NAME,
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(503).json({
        status: 'DEGRADED',
        database: 'disconnected',
        engine: 'Google Cloud Firestore',
        error: health.error || 'Firestore not connected',
        brand: brandConfig.BRAND_NAME,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    return res.status(503).json({
      status: 'ERROR',
      database: 'disconnected',
      engine: 'Google Cloud Firestore',
      error: err.message,
      brand: brandConfig.BRAND_NAME,
      timestamp: new Date().toISOString(),
    });
  }
});

// ---------------------------------------------------------------------------
// 5. STATIC ASSET SERVING & SPA FALLBACK
// ---------------------------------------------------------------------------
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: `API endpoint ${req.method} ${req.url} not found.` });
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`API Server for ${brandConfig.BRAND_NAME} is active. Run client for frontend.`);
    }
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server exception:', err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({ error: 'An unexpected error occurred. Please try again or contact support.' });
});

// Cloud Run dynamic PORT binding (Requirement 33)
const PORT = parseInt(process.env.PORT, 10) || brandConfig.PORT || 5000;
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`✨ ${brandConfig.BRAND_NAME} Production Server is running on port ${PORT}`);
    console.log(`✨ Engine: Google Cloud Firestore (Node.js Express)`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
