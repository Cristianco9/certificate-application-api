import { CertificateEnrollmentServices } from '../../services/certificateEnrollmentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to link an enrollment to a certificate.
 *
 * Extracts the new CertificateEnrollment data from the request body,
 * delegates the creation to CertificateEnrollmentServices, and responds
 * according to the outcome. The rotated JWT is not signed here:
 * authAppVerifyToken already generated it upstream, wrote it to the
 * httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in
 * the body.
 *
 * Note: this endpoint is a low-level administrative repair path. The
 * normal certificate-issuance flow (CertificateServices.createOne)
 * already links every enrollment of a new certificate inside a single
 * transaction, so a caller rarely needs to hit this directly.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateEnrollmentSchema.newCertificateEnrollmentData).
 * @param {string} req.body.certificateId - The id of the certificate to link.
 * @param {string} req.body.enrollmentId - The id of the enrollment to link.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the operation result and the rotated token.
 */
export const createOneCertificateEnrollment = async (req, res, next) => {
  const newCertificateEnrollment = {
    certificateId: req.body.certificateId,
    enrollmentId: req.body.enrollmentId,
  };

  const certificateEnrollmentManager = new CertificateEnrollmentServices();

  try {
    const response = await certificateEnrollmentManager.createOne(newCertificateEnrollment);

    if (response.status === 'CREATED SUCCESSFULLY') {
      return res.status(201).json({
        success: true,
        message: 'Matrícula vinculada al certificado exitosamente',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible vincular la matrícula al certificado en la base de datos',
    });
    next(boomError);
  }
};
