import { CertificateServices } from '../../services/certificateServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to list every certificate delivered to a given
 * recipient.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateSchema.listCertificatesByRecipient).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>}
 */
export const listCertificatesByRecipient = async (req, res, next) => {
  const { recipientId } = req.body;
  const certificateManager = new CertificateServices();

  try {
    const { total, records } = await certificateManager.listByRecipient(recipientId);

    return res.status(200).json({
      success: true,
      message: 'Certificados del receptor encontrados exitosamente',
      total,
      certificates: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los certificados del receptor indicado',
    });
    next(boomError);
  }
};
