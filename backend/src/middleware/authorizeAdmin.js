const env = require('../config/env');
const { errorResponse } = require('../utils/response');

const authorizeAdmin = async (req, res, next) => {
  if (!req.user || !req.user.uid) {
    return errorResponse(res, 'Unauthorized: Admin verification requires prior authentication.', 401, 'AUTH_REQUIRED');
  }

  // 1. Direct custom claims check (cryptographically signed)
  if (req.user.role === 'ADMIN' || req.user.admin === true) {
    return next();
  }

  // 2. Verified admin email check from server config (STRICTLY requires email_verified: true)
  const isEmailVerified = req.user.decodedToken && req.user.decodedToken.email_verified === true;
  if (isEmailVerified && req.user.email && Array.isArray(env.ADMIN_EMAILS) && env.ADMIN_EMAILS.includes(req.user.email.toLowerCase().trim())) {
    return next();
  }

  // 3. Database user role verification (bound to verified authProviderId)
  try {
    const User = require('../models/User');
    const dbUser = await User.findOne({
      authProviderId: req.user.uid,
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
