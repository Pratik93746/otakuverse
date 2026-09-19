const { errorResponse } = require('../utils/response');

const notFound = (req, res) => {
  return errorResponse(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );
};

module.exports = notFound;
