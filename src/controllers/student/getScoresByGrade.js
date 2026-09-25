import { StudentServices } from '../../services/studentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every score recorded for a student within
 * a specific grade (across all years/groups the student was enrolled in
 * that grade), embedding the student's identifying name data on each row.
 *
 * Extracts the student id and the grade name from the request body,
 * delegates the lookup to StudentServices (which filters the
 * Score -> Enrollment -> Group -> Grade include tree by studentId and by
 * the Grade's ENUM name, and orders by subject name ascending), and
 * responds according to the outcome.
 *
 * Unlike its sibling endpoints getAcademicHistory and
 * getScoresByStudentAndYear — whose row shape is the flattened
 * "report row" produced by _formatScoreRow — this endpoint additionally
 * carries the student's { id, firstName, firstLastName } on every record.
 * That is intentional: a per-grade query is the one academic-history view
 * most likely to be printed or exported standalone (e.g. a per-grade
 * transcript page), so the name identifying the student travels with the
 * row rather than being assumed from the request.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated
 * it upstream, wrote it to the httpOnly 'authentication' cookie, and exposed
 * the same value via res.locals.newUserToken for clients (e.g. the React SPA)
 * that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see studentSchema.getScoresByStudentAndGrade).
 * @param {string} req.body.studentId - The id of the student whose scores to retrieve.
 * @param {string} req.body.gradeName - The exact grade name (ENUM, e.g. 'Séptimo') to filter by.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 *
 * @returns {Promise<void>} - Sends a JSON response with the matching scores
 * (each entry shaped as { year, grade, group, subject, originalScore,
 * scoreType, remedialScore, enrollmentId, student }), the count of
 * returned records, and the rotated token.
 */
export const getScoresByStudentAndGrade = async (req, res, next) => {
  const { studentId, gradeName } = req.body;
  const studentManager = new StudentServices();

  try {
    const { total, records } = await studentManager.listScoresByStudentAndGrade(studentId, gradeName);

    return res.status(200).json({
      success: true,
      message: 'Calificaciones del estudiante encontradas exitosamente',
      total,
      scores: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar las calificaciones del estudiante para el grado indicado',
    });
    next(boomError);
  }
};
