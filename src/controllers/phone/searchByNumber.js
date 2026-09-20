import { PhoneServices } from '../../services/phoneServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to search phones whose number partially matches the provided text.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see phoneSchema.searchPhonesByNumber).
 * @param {string} req.body.partialNumber - The partial number to search for.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching phones and the rotated token.
 */
export const searchPhonesByNumber = async (req, res, next) => {
  const { partialNumber } = req.body;
  const phoneManager = new PhoneServices();

  try {
    const { total, records } = await phoneManager.listByPartialNumber(partialNumber);

    return res.status(200).json({
      success: true,
      message: 'Búsqueda de teléfonos realizada exitosamente',
      total,
      phones: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible buscar los teléfonos',
    });
    next(boomError);
  }
};
