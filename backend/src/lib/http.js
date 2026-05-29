class ApiError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
  }
}

const badRequest = (message, code = 'BAD_REQUEST') => new ApiError(400, message, code);
const unauthorized = (message = 'Unauthorized', code = 'UNAUTHORIZED') => new ApiError(401, message, code);
const forbidden = (message = 'Forbidden', code = 'FORBIDDEN') => new ApiError(403, message, code);
const notFound = (message = 'Not found', code = 'NOT_FOUND') => new ApiError(404, message, code);
const conflict = (message, code = 'CONFLICT') => new ApiError(409, message, code);

const sendSuccess = (res, data, { status = 200, message, pagination } = {}) => {
  const body = { status: 'success', data };
  if (message) body.message = message;
  if (pagination) body.pagination = pagination;
  return res.status(status).json(body);
};

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  sendSuccess,
  asyncHandler,
};
