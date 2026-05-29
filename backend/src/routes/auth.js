const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');
const config = require('../config/env');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validation/schemas');
const { sendSuccess, asyncHandler, conflict, unauthorized, notFound } = require('../lib/http');

const router = express.Router();

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

const issueToken = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.accessTokenTtl });
};

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw conflict('User already exists with this email', 'EMAIL_TAKEN');
  }

  const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role: 'RECEPTIONIST' },
  });

  sendSuccess(res, { user: publicUser(user) }, { status: 201, message: 'User registered successfully' });
}));

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  const isMatch = user ? await bcrypt.compare(password, user.password) : false;

  if (!user || !isMatch) {
    throw unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const token = issueToken(user);
  sendSuccess(res, { token, user: publicUser(user) });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    throw notFound('User not found');
  }
  sendSuccess(res, { user });
}));

module.exports = router;
