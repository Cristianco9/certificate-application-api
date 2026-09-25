import { StudentServices } from '../../services/studentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve a student's full academic history across
 * every year they have been enrolled, including the grade, group, and
 * subject-level scores recorded for each enrollment.
 *
 * Extracts the student id from the request body, delegates the lookup to
 * StudentServices (which builds the Score -> Enrollment -> Group -> Grade
 * and Score -> Subject include tree, filtered by the given student and
 * ordered by year, grade, and subject), and responds according to the
 * outcome.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated
 * it upstream, wrote it to the httpOnly 'authentication' cookie, and exposed
 * the same value via res.locals.newUserToken for clients (e.g. the React SPA)
 * that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see studentSchema.getAcademicHistory).
 * @param {string} req.body.studentId - The id of the student whose academic history to retrieve.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 *
 * @returns {Promise<void>} - Sends a JSON response with the student's academic
 * history (flattened to report-row shape: { year, grade, group, subject,
 * originalScore, scoreType, remedialScore, enrollmentId }), the count of
 * returned records, and the rotated token.
 */
export const getStudentAcademicHistory = async (req, res, next) => {
  const { studentId } = req.body;
  const studentManager = new StudentServices();

  try {
    const { total, records } = await studentManager.getAcademicHistory(studentId);

    return res.status(200).json({
      success: true,
      message: 'Histórico académico del estudiante encontrado exitosamente',
      total,
      history: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar el histórico académico del estudiante',
    });
    next(boomError);
  }
};
