const { validationResult } = require('express-validator');
const { error } = require('../utils/responseHelper');

const validateRequest = (req, res, next) => {
  const validationErrors = validationResult(req);

  if (!validationErrors.isEmpty()) {
    return error(res, 'Validation failed', 400, validationErrors.array());
  }

  return next();
};

module.exports = validateRequest;
