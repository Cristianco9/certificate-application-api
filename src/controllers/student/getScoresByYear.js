import { StudentServices } from '../../services/studentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every score recorded for a student within
 * a specific academic year.
 *
 * Extracts the student id and the academic year from the request body,
 * delegates the lookup to StudentServices (which filters the
 * Score -> Enrollment -> Group -> Grade include tree by studentId and by
 * the Group's year, then orders by grade name and subject name ascending),
 * and responds according to the outcome.
 *
 * This is the primary driver of the per-year "boletín" / report-card view:
 * a single call returns every subject-grade pair the student earned during
 * one calendar year, ready to be rendered or handed to the certificate
 * generation flow described as a known gap in AGENTS.md section 10.
 *
 * Unlike getScoresByStudentAndGrade, the returned rows do NOT carry a
 * nested `student` object — the student identity is assumed to come from
 * the request context, not from the response payload. Keep that asymmetry
 * in mind if you add a fourth academic-progress read endpoint: currently
 * only get-scores-by-grade embeds the student on each row.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated
 * it upstream, wrote it to the httpOnly 'authentication' cookie, and exposed
 * the same value via res.locals.newUserToken for clients (e.g. the React SPA)
 * that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see studentSchema.getScoresByStudentAndYear).
 * @param {string} req.body.studentId - The id of the student whose scores to retrieve.
 * @param {string} req.body.year - The academic year to filter by (4-digit string, 1900-2099).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 *
 * @returns {Promise<void>} - Sends a JSON response with the matching scores
 * (each entry shaped as { year, grade, group, subject, originalScore,
 * scoreType, remedialScore, enrollmentId }), the count of returned records,
 * and the rotated token.
 */
export const getScoresByStudentAndYear = async (req, res, next) => {
  const { studentId, year } = req.body;
  const studentManager = new StudentServices();

  try {
    const { total, records } = await studentManager.listScoresByStudentAndYear(studentId, year);

    return res.status(200).json({
      success: true,
      message: 'Calificaciones del estudiante encontradas exitosamente',
      total,
      scores: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar las calificaciones del estudiante para el año indicado',
    });
    next(boomError);
  }
};
