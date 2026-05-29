const { ApiError } = require('../lib/http');
const config = require('../config/env');

const PRISMA_STATUS = {
  P2002: { status: 409, code: 'CONFLICT', message: 'A record with these values already exists.' },
  P2003: { status: 409, code: 'FK_CONSTRAINT', message: 'Operation blocked by related records.' },
  P2025: { status: 404, code: 'NOT_FOUND', message: 'Record not found.' },
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ status: 'error', error: 'Route not found', code: 'NOT_FOUND' });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ApiError) {
    const body = { status: 'error', error: err.message, code: err.code };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  if (err && err.code && PRISMA_STATUS[err.code]) {
    const mapped = PRISMA_STATUS[err.code];
    return res.status(mapped.status).json({ status: 'error', error: mapped.message, code: mapped.code });
  }

  console.error('[ERROR]', err);
  res.status(500).json({ status: 'error', error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' });
};

module.exports = { notFoundHandler, errorHandler };
