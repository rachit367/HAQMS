const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { unauthorized, forbidden } = require('../lib/http');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(unauthorized('Access denied. No token provided.'));
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (error) {
    next(unauthorized('Invalid or expired token.', 'INVALID_TOKEN'));
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(unauthorized('User context missing.'));
  }
  if (roles.length && !roles.includes(req.user.role)) {
    return next(forbidden(`Requires role: ${roles.join(' or ')}`));
  }
  next();
};

const authorizeAdmin = authorize('ADMIN');

module.exports = {
  authenticate,
  authorize,
  authorizeAdmin,
};
