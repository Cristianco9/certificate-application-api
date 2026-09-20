import { ScoreServices } from '../../services/scoreServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every score belonging to a given enrollment.
 * This is the primary lookup used to build a student's academic history/report card.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req
 * @param {Object} req.body
 * @param {string} req.body.enrollmentId
 * @param {Object} res
 * @param {string} res.locals.newUserToken
 * @param {Function} next
 * @returns {Promise<void>}
 */
export const listScoresByEnrollment = async (req, res, next) => {
  const { enrollmentId } = req.body;
  const scoreManager = new ScoreServices();

  try {
    const { total, records } = await scoreManager.listByEnrollment(enrollmentId);

    return res.status(200).json({
      success: true,
      message: 'Calificaciones encontradas exitosamente',
      total,
      scores: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar las calificaciones para la matrícula indicada',
    });
    next(boomError);
  }
};
