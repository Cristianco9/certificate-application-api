import { SubjectServices } from '../../services/subjectServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to search subjects whose name partially matches the provided text.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see subjectSchema.searchSubjectsByName).
 * @param {string} req.body.partialName - The partial name to search for.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching subjects and the rotated token.
 */
export const searchSubjectsByName = async (req, res, next) => {
  const { partialName } = req.body;
  const subjectManager = new SubjectServices();

  try {
    const { total, records } = await subjectManager.listByPartialName(partialName);

    return res.status(200).json({
      success: true,
      message: 'Búsqueda de asignaturas realizada exitosamente',
      total,
      subjects: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible buscar las asignaturas',
    });
    next(boomError);
  }
};
