import { CertificateServices } from '../../services/certificateServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve the single certificate (if any) issued
 * for a given enrollment.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateSchema.getCertificateByEnrollment).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>}
 */
export const getCertificateByEnrollment = async (req, res, next) => {
  const { enrollmentId } = req.body;
  const certificateManager = new CertificateServices();

  try {
    const theCertificate = await certificateManager.getByEnrollment(enrollmentId);

    return res.status(200).json({
      success: true,
      message: 'Certificado encontrado exitosamente',
      certificate: theCertificate,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible encontrar el certificado para la matrícula indicada',
    });
    next(boomError);
  }
};
