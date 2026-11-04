/** Error carrying an HTTP status, so client mistakes are 4xx instead of a generic 500. */
const httpError = (message, statusCode = 400, code = 'BAD_REQUEST') =>
  Object.assign(new Error(message), { statusCode, code });

module.exports = httpError;
