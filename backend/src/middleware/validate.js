const { badRequest } = require('../lib/http');

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    const error = badRequest('Validation failed', 'VALIDATION_ERROR');
    error.details = details;
    return next(error);
  }
  req[source] = result.data;
  next();
};

module.exports = { validate };
