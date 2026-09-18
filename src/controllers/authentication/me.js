// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to return the currently authenticated user's
 * identity: their numeric id and their role name, both read directly
 * from the JWT that authAppVerifyToken already verified upstream.
 *
 * No database lookup is required: 'id' and 'role' are the only two
 * claims signed into the token at login time (see
 * AuthenticationServices.login), and the signature has already been
 * checked by the middleware before this controller runs. Reading them
 * from req.user is therefore both cheaper and safer than re-querying
 * 'usuario', since a token that was tampered with would never reach
 * this point.
 *
 * The frontend uses this endpoint once after mount (or after a hard
 * refresh) to bootstrap role-based authorization without having to
 * parse the httpOnly 'authentication' cookie, which is deliberately
 * inaccessible to JavaScript.
 *
 * No 'authentication' field is echoed here: this is a read-only
 * identity lookup, not a session mutation, so there is nothing for the
 * client to refresh. authAppVerifyToken still rotates the cookie on
 * every request as usual.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.user - The decoded JWT payload set by authAppVerifyToken.
 * @param {number} req.user.id - The authenticated user's id.
 * @param {string} req.user.role - The authenticated user's role name.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function in the Express.js stack.
 *
 * @returns {Promise<void>} - Sends a JSON response with the user's id and role.
 */
export const getCurrentUser = (req, res, next) => {
  try {
    const { id, role } = req.user;

    return res.status(200).json({
      success: true,
      message: 'Active session',
      id,
      role,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible obtener la información de la sesión actual',
    });
    next(boomError);
  }
};
