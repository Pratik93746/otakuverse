const admin = require('../config/firebase');
const { errorResponse } = require('../utils/response');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(
      res,
      'Unauthorized: Missing or malformed Bearer token in Authorization header.',
      401,
      'AUTH_UNAUTHORIZED'
    );
  }

  const idToken = authHeader.split('Bearer ')[1].trim();

  if (!idToken) {
    return errorResponse(
      res,
      'Unauthorized: Bearer token string is empty.',
      401,
      'AUTH_TOKEN_EMPTY'
    );
  }

  try {
    // checkRevoked=true: a disabled/signed-out-everywhere account stops working immediately.
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);
    const User = require('../models/User');
    const dbUser = await User.findOne({ authProviderId: decodedToken.uid }).select('isActive role').lean();
    if (dbUser && dbUser.isActive === false) {
      return errorResponse(res, 'Forbidden: Account is inactive or suspended.', 403, 'AUTH_USER_INACTIVE');
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email ? decodedToken.email.toLowerCase().trim() : null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      role: (dbUser && dbUser.role) || decodedToken.role || (decodedToken.admin ? 'ADMIN' : 'USER'),
      decodedToken,
    };
    next();
  } catch (error) {
    console.warn(`[AuthMiddleware] Token verification rejected: ${error.message}`);
    return errorResponse(
      res,
      'Forbidden: Authentication token is invalid, expired, or revoked.',
      401,
      'AUTH_TOKEN_INVALID'
    );
  }
};

module.exports = authenticate;
