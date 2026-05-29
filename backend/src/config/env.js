const dotenv = require('dotenv');

dotenv.config();

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: required('JWT_SECRET'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
};

config.isProduction = config.nodeEnv === 'production';

module.exports = config;
