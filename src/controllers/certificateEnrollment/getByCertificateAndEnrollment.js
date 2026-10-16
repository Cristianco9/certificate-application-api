import { CertificateEnrollmentServices } from '../../services/certificateEnrollmentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve the single CertificateEnrollment
 * record (if any) linking a specific certificate to a specific
 * enrollment.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateEnrollmentSchema.getCertificateEnrollmentByCertificateAndEnrollment).
 * @param {string} req.body.certificateId - The id of the certificate.
 * @param {string} req.body.enrollmentId - The id of the enrollment.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching link and the rotated token.
 */
export const getCertificateEnrollmentByCertificateAndEnrollment = async (req, res, next) => {
  const { certificateId, enrollmentId } = req.body;
  const certificateEnrollmentManager = new CertificateEnrollmentServices();

  try {
    const theLink = await certificateEnrollmentManager.getByCertificateAndEnrollment(
      certificateId,
      enrollmentId
    );

    return res.status(200).json({
      success: true,
      message: 'Vínculo certificado-matrícula encontrado exitosamente',
      certificateEnrollment: theLink,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible encontrar el vínculo entre el certificado y la matrícula indicados',
    });
    next(boomError);
  }
};
