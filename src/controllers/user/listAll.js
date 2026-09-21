import { UserServices } from '../../services/userServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every user, ordered by id ascending.
 * Passwords are automatically excluded by the service.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object (no body parameters required).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the full list of users and the rotated token.
 */
export const listAllUsers = async (req, res, next) => {
  const userManager = new UserServices();

  try {
    const { total, records } = await userManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Usuarios encontrados exitosamente',
      total,
      users: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los usuarios en la base de datos',
    });
    next(boomError);
  }
};
