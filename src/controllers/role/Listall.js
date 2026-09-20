// Import the RoleServices class to manage role-related database operations
import { RoleServices } from '../../services/roleServices.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every role, ordered alphabetically by
 * name.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already
 * generated it upstream, wrote it to the httpOnly 'authentication'
 * cookie, and exposed the same value via res.locals.newUserToken for
 * clients (e.g. the React SPA) that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object (no body parameters required).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 *
 * @returns {Promise<void>} - Sends a JSON response with the full list of roles and the rotated token.
 */
export const listAllRoles = async (req, res, next) => {
  // Instantiate the service that manages role operations
  const roleManager = new RoleServices();

  try {
    // Attempt to retrieve all roles
    const { total, records } = await roleManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Roles encontrados exitosamente',
      total,
      roles: records,
      // Echo the token already rotated by authAppVerifyToken
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    // RoleServices already throws boomified errors; boomify() passes
    // those through untouched and only defaults unexpected errors to a 500.
    const boomError = Boom.boomify(error, {
      message: 'No es posible encontrar los roles',
    });
    next(boomError);
  }
};
