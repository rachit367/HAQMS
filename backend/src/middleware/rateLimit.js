const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', error: 'Too many attempts. Try again later.', code: 'RATE_LIMITED' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', error: 'Too many requests. Slow down.', code: 'RATE_LIMITED' },
});

module.exports = { authLimiter, apiLimiter };
