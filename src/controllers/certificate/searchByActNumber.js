import { CertificateServices } from '../../services/certificateServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to search certificates by partial act number.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateSchema.searchCertificatesByActNumber).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>}
 */
export const searchCertificatesByActNumber = async (req, res, next) => {
  const { partialActNumber } = req.body;
  const certificateManager = new CertificateServices();

  try {
    const { total, records } = await certificateManager.listByPartialActNumber(partialActNumber);

    return res.status(200).json({
      success: true,
      message: 'Búsqueda de certificados realizada exitosamente',
      total,
      certificates: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible buscar los certificados por su número de acta',
    });
    next(boomError);
  }
};
