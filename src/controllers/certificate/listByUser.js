import { CertificateServices } from '../../services/certificateServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to list every certificate issued by a given user.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateSchema.listCertificatesByUser).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>}
 */
export const listCertificatesByUser = async (req, res, next) => {
  const { userId } = req.body;
  const certificateManager = new CertificateServices();

  try {
    const { total, records } = await certificateManager.listByUser(userId);

    return res.status(200).json({
      success: true,
      message: 'Certificados del usuario encontrados exitosamente',
      total,
      certificates: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los certificados del usuario indicado',
    });
    next(boomError);
  }
};
