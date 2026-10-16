import { CertificateEnrollmentServices } from '../../services/certificateEnrollmentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to list every CertificateEnrollment record.
 *
 * @param {Object} req - The Express request object (no body parameters required).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the full list and the rotated token.
 */
export const listAllCertificateEnrollments = async (req, res, next) => {
  const certificateEnrollmentManager = new CertificateEnrollmentServices();

  try {
    const { total, records } = await certificateEnrollmentManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Vínculos certificado-matrícula encontrados exitosamente',
      total,
      certificateEnrollments: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los vínculos certificado-matrícula en la base de datos',
    });
    next(boomError);
  }
};
