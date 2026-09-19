const env = require('../config/env');
const { errorResponse } = require('../utils/response');

const authorizeAdmin = async (req, res, next) => {
  if (!req.user || !req.user.uid) {
    return errorResponse(res, 'Unauthorized: Admin verification requires prior authentication.', 401, 'AUTH_REQUIRED');
  }

  // 1. Direct custom claims check
  if (req.user.role === 'ADMIN' || req.user.admin === true) {
    return next();
  }

  // 2. Verified admin email check from server config
  if (req.user.email && env.ADMIN_EMAILS.includes(req.user.email.toLowerCase().trim())) {
    return next();
  }

  // 3. Database user role verification
  try {
    const User = require('../models/User');
    const dbUser = await User.findOne({
      $or: [{ authProviderId: req.user.uid }, { email: req.user.email }],
    }).lean();

    if (dbUser && dbUser.role === 'ADMIN' && dbUser.isActive !== false) {
      req.dbUser = dbUser;
      return next();
    }
  } catch (err) {
    console.warn('⚠️ [AdminAuth] DB Role check notice:', err.message);
  }

  return errorResponse(
    res,
    'Forbidden: You do not possess administrative privileges to perform this operation.',
    403,
    'FORBIDDEN_ADMIN_ACCESS'
  );
};

module.exports = authorizeAdmin;
