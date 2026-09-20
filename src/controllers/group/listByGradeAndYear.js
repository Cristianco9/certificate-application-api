import { GroupServices } from '../../services/groupServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every group matching a given grade and academic year.
 * Supports the 'Combinación de filtros' search requirement described in context.md.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see groupSchema.listGroupsByGradeAndYear).
 * @param {string} req.body.gradeId - The id of the grade to filter by.
 * @param {string} req.body.year - The academic year to filter by.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching groups and the rotated token.
 */
export const listGroupsByGradeAndYear = async (req, res, next) => {
  const { gradeId, year } = req.body;
  const groupManager = new GroupServices();

  try {
    const { total, records } = await groupManager.listByGradeAndYear(gradeId, year);

    return res.status(200).json({
      success: true,
      message: 'Grupos encontrados exitosamente',
      total,
      groups: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los grupos para el grado y año indicado',
    });
    next(boomError);
  }
};
