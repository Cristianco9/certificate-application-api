import { ScoreServices } from '../../services/scoreServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every score, ordered by id ascending.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {string} res.locals.newUserToken
 * @param {Function} next
 * @returns {Promise<void>}
 */
export const listAllScores = async (req, res, next) => {
  const scoreManager = new ScoreServices();

  try {
    const { total, records } = await scoreManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Calificaciones encontradas exitosamente',
      total,
      scores: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar las calificaciones en la base de datos',
    });
    next(boomError);
  }
};
