import { GroupServices } from '../../services/groupServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to search groups whose name partially matches the provided text.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see groupSchema.searchGroupsByName).
 * @param {string} req.body.partialName - The partial name to search for.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching groups and the rotated token.
 */
export const searchGroupsByName = async (req, res, next) => {
  const { partialName } = req.body;
  const groupManager = new GroupServices();

  try {
    const { total, records } = await groupManager.listByPartialName(partialName);

    return res.status(200).json({
      success: true,
      message: 'Búsqueda de grupos realizada exitosamente',
      total,
      groups: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible buscar los grupos',
    });
    next(boomError);
  }
};
