// Import the GenderServices class to manage gender-related database operations
import { GenderServices } from '../../services/genderServices.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every gender, ordered alphabetically
 * by name.
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
 * @returns {Promise<void>} - Sends a JSON response with the full list of genders and the rotated token.
 */
export const listAllGenders = async (req, res, next) => {
  // Instantiate the service that manages gender operations
  const genderManager = new GenderServices();

  try {
    // Attempt to retrieve all genders
    const { total, records } = await genderManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Géneros encontrados exitosamente',
      total,
      genders: records,
      // Echo the token already rotated by authAppVerifyToken
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    // GenderServices already throws boomified errors; boomify() passes
    // those through untouched and only defaults unexpected errors to a 500.
    const boomError = Boom.boomify(error, {
      message: 'No es posible encontrar los géneros',
    });
    next(boomError);
  }
};
