import { CertificateEnrollmentServices } from '../../services/certificateEnrollmentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to unlink an enrollment from a certificate by
 * composite key (certificateId + enrollmentId), without requiring a
 * prior lookup of the link id.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateEnrollmentSchema.unlinkCertificateEnrollment).
 * @param {string} req.body.certificateId - The id of the certificate.
 * @param {string} req.body.enrollmentId - The id of the enrollment.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the operation result and the rotated token.
 */
export const unlinkCertificateEnrollment = async (req, res, next) => {
  const { certificateId, enrollmentId } = req.body;
  const certificateEnrollmentManager = new CertificateEnrollmentServices();

  try {
    const response = await certificateEnrollmentManager.unlinkByCertificateAndEnrollment(
      certificateId,
      enrollmentId
    );

    if (response.status === 'UNLINKED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Matrícula desvinculada del certificado exitosamente',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible desvincular la matrícula del certificado en la base de datos',
    });
    next(boomError);
  }
};
