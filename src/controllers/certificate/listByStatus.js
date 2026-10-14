import { CertificateServices } from '../../services/certificateServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to list every certificate in a given status
 * ('EMITIDO', 'ANULADO' or 'REIMPRESO').
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateSchema.listCertificatesByStatus).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>}
 */
export const listCertificatesByStatus = async (req, res, next) => {
  const { status } = req.body;
  const certificateManager = new CertificateServices();

  try {
    const { total, records } = await certificateManager.listByStatus(status);

    return res.status(200).json({
      success: true,
      message: 'Certificados encontrados exitosamente',
      total,
      certificates: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los certificados con el estado indicado',
    });
    next(boomError);
  }
};
