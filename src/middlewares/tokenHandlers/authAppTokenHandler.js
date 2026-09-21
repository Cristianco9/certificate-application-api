import jwt from 'jsonwebtoken';
import { config } from '../../config/config.js';
import { signUserToken } from '../../utils/auth/tokenSign.js';

/**
 * Middleware to authenticate API requests using a JWT stored
 * in an HTTP-only cookie.
 *
 * If the token is valid, a new token is generated and the
 * authentication cookie is refreshed.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Response|void}
 */
export const authAppVerifyToken = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to access this resource.',
      error: 'AUTHENTICATION_REQUIRED',
    });
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication credentials. Please sign in again.',
      error: 'INVALID_TOKEN',
    });
  }

  jwt.verify(token, config.authAppJwtKey, { algorithms: ['HS256'] }, (err, decoded) => {
    if (err) {
      // no res.clearCookie anymore
      const expired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        success: false,
        message: expired
          ? 'Your session has expired. Please sign in again.'
          : 'Invalid authentication credentials. Please sign in again.',
        error: expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      });
    }

    const userData = { id: decoded.id, role: decoded.role };
    const newUserToken = signUserToken(userData, config.authAppJwtKey, '1h');

    res.locals.newUserToken = newUserToken;       // controllers already read this
    res.setHeader('X-Access-Token', newUserToken); // also travels in a header
    req.user = userData;
    return next();
  });
};
