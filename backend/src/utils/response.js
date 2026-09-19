/**
 * Standard API Response Builder
 */
const successResponse = (res, data = {}, statusCode = 200, extra = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...extra,
  });
};

const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, code = 'INTERNAL_ERROR', details = null) => {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details && process.env.NODE_ENV !== 'production') {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse,
};
