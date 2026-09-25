import { StudentServices } from '../../services/studentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve the distinct academic years a student has
 * been enrolled in, each with its associated grade and group.
 *
 * Extracts the student id from the request body, delegates the lookup to
 * StudentServices (which traverses Enrollment -> Group -> Grade for the
 * given student, orders by academic year ascending, and de-duplicates on
 * year + grade + group to mirror the service's SELECT DISTINCT behavior),
 * and responds according to the outcome.
 *
 * This is a lighter-weight companion to getStudentAcademicHistory: instead
 * of the full per-subject score rows, it returns only the year/grade/group
 * skeleton, which the frontend uses to render year-selector menus or
 * grade-level summaries before drilling into a specific year's scores.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated
 * it upstream, wrote it to the httpOnly 'authentication' cookie, and exposed
 * the same value via res.locals.newUserToken for clients (e.g. the React SPA)
 * that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see studentSchema.getCourseYears).
 * @param {string} req.body.studentId - The id of the student whose course years to retrieve.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 *
 * @returns {Promise<void>} - Sends a JSON response with the student's course
 * years (each entry shaped as { year, grade: { id, name } | null,
 * group: { id, name } }), the count of returned records, and the rotated
 * token.
 */
export const getStudentCourseYears = async (req, res, next) => {
  const { studentId } = req.body;
  const studentManager = new StudentServices();

  try {
    const { total, records } = await studentManager.listCourseYears(studentId);

    return res.status(200).json({
      success: true,
      message: 'Años cursados por el estudiante encontrados exitosamente',
      total,
      years: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los años cursados por el estudiante',
    });
    next(boomError);
  }
};
