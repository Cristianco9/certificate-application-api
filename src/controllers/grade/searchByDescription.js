import { GradeServices } from '../../services/gradeServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to search grades whose description partially matches
 * the provided text.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see gradeSchema.searchGradesByDescription).
 * @param {string} req.body.partialDescription - The partial description to search for.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching grades and the rotated token.
 */
export const searchGradesByDescription = async (req, res, next) => {
  const { partialDescription } = req.body;
  const gradeManager = new GradeServices();

  try {
    const { total, records } = await gradeManager.listByPartialDescription(partialDescription);

    return res.status(200).json({
      success: true,
      message: 'Búsqueda de grados realizada exitosamente',
      total,
      grades: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible buscar los grados',
    });
    next(boomError);
  }
};
