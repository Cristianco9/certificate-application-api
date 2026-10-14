import { CertificateServices } from '../../services/certificateServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to list every certificate.
 *
 * @param {Object} req - The Express request object (no body parameters required).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>}
 */
export const listAllCertificates = async (req, res, next) => {
  const certificateManager = new CertificateServices();

  try {
    const { total, records } = await certificateManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Certificados encontrados exitosamente',
      total,
      certificates: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los certificados en la base de datos',
    });
    next(boomError);
  }
};
