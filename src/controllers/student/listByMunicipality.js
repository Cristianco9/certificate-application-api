import { StudentServices } from '../../services/studentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every student belonging to a given municipality.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see studentSchema.listStudentsByMunicipality).
 * @param {string} req.body.municipalityId - The id of the municipality.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching students and the rotated token.
 */
export const listStudentsByMunicipality = async (req, res, next) => {
  const { municipalityId } = req.body;
  const studentManager = new StudentServices();

  try {
    const { total, records } = await studentManager.listByMunicipality(municipalityId);

    return res.status(200).json({
      success: true,
      message: 'Estudiantes encontrados exitosamente',
      total,
      students: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los estudiantes para el municipio indicado',
    });
    next(boomError);
  }
};
