const { errorResponse } = require('../utils/apiResponse');

function notFoundHandler(req, res) {
  return errorResponse(res, 'Resource not found', null, 404);
}

function globalErrorHandler(err, req, res, next) {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return errorResponse(res, message, err.errors || null, statusCode);
}

module.exports = { notFoundHandler, globalErrorHandler };
