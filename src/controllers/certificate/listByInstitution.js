import { CertificateServices } from '../../services/certificateServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to list every certificate issued under a given
 * institution.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateSchema.listCertificatesByInstitution).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>}
 */
export const listCertificatesByInstitution = async (req, res, next) => {
  const { institutionId } = req.body;
  const certificateManager = new CertificateServices();

  try {
    const { total, records } = await certificateManager.listByInstitution(institutionId);

    return res.status(200).json({
      success: true,
      message: 'Certificados de la institución encontrados exitosamente',
      total,
      certificates: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los certificados de la institución indicada',
    });
    next(boomError);
  }
};
