const { errorResponse } = require('../utils/response');

const validate = (validatorFn) => {
  return (req, res, next) => {
    const error = validatorFn(req);
    if (error) {
      return errorResponse(res, error, 400, 'VALIDATION_ERROR');
    }
    next();
  };
};

module.exports = validate;
