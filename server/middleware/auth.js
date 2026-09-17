const admin = require('../config/firebase');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing or malformed Authorization header with Bearer token.'
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();

  if (!idToken) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Bearer token is empty.'
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error(`[AuthMiddleware] Token verification failed: ${error.message}`);
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Invalid, expired, or revoked authentication token.',
      code: error.code || 'AUTH_TOKEN_INVALID'
    });
  }
};

module.exports = authMiddleware;
