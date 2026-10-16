import { CertificateEnrollmentServices } from '../../services/certificateEnrollmentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every enrollment linked to a given
 * certificate. This is the primary lookup used to render the
 * multi-enrollment section of a certificate PDF.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateEnrollmentSchema.listCertificateEnrollmentsByCertificate).
 * @param {string} req.body.certificateId - The id of the certificate.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching links and the rotated token.
 */
export const listCertificateEnrollmentsByCertificate = async (req, res, next) => {
  const { certificateId } = req.body;
  const certificateEnrollmentManager = new CertificateEnrollmentServices();

  try {
    const { total, records } = await certificateEnrollmentManager.listByCertificate(certificateId);

    return res.status(200).json({
      success: true,
      message: 'Matrículas del certificado encontradas exitosamente',
      total,
      certificateEnrollments: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar las matrículas del certificado indicado',
    });
    next(boomError);
  }
};
