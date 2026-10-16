import { CertificateEnrollmentServices } from '../../services/certificateEnrollmentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every certificate linked to a given
 * enrollment. Returns at most one record in practice, since
 * 'id_matricula' is UNIQUE — an enrollment belongs to at most one
 * certificate.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateEnrollmentSchema.listCertificateEnrollmentsByEnrollment).
 * @param {string} req.body.enrollmentId - The id of the enrollment.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching links and the rotated token.
 */
export const listCertificateEnrollmentsByEnrollment = async (req, res, next) => {
  const { enrollmentId } = req.body;
  const certificateEnrollmentManager = new CertificateEnrollmentServices();

  try {
    const { total, records } = await certificateEnrollmentManager.listByEnrollment(enrollmentId);

    return res.status(200).json({
      success: true,
      message: 'Certificados de la matrícula encontrados exitosamente',
      total,
      certificateEnrollments: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los certificados de la matrícula indicada',
    });
    next(boomError);
  }
};
