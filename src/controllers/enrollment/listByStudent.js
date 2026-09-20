import { EnrollmentServices } from '../../services/enrollmentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every enrollment belonging to a given
 * student, ordered by enrollment date (most recent first). Supports
 * building a student's full academic history across grades and years.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req
 * @param {Object} req.body
 * @param {string} req.body.studentId
 * @param {Object} res
 * @param {string} res.locals.newUserToken
 * @param {Function} next
 * @returns {Promise<void>}
 */
export const listEnrollmentsByStudent = async (req, res, next) => {
  const { studentId } = req.body;
  const enrollmentManager = new EnrollmentServices();

  try {
    const { total, records } = await enrollmentManager.listByStudent(studentId);

    return res.status(200).json({
      success: true,
      message: 'Matrículas encontradas exitosamente',
      total,
      enrollments: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar las matrículas para el estudiante indicado',
    });
    next(boomError);
  }
};
