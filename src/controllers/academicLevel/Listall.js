// Import the AcademicLevelServices class to manage academic-level-related database operations
import { AcademicLevelServices } from '../../services/academicLevelServices.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every academic level, ordered
 * alphabetically by name.
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
 * @returns {Promise<void>} - Sends a JSON response with the full list of academic levels and the rotated token.
 */
export const listAllAcademicLevels = async (req, res, next) => {
  // Instantiate the service that manages academic level operations
  const academicLevelManager = new AcademicLevelServices();

  try {
    // Attempt to retrieve all academic levels
    const { total, records } = await academicLevelManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Niveles académicos encontrados exitosamente',
      total,
      academicLevels: records,
      // Echo the token already rotated by authAppVerifyToken
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible encontrar los niveles académicos',
    });
    next(boomError);
  }
};
