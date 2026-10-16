import { CertificateEnrollmentServices } from '../../services/certificateEnrollmentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve a single CertificateEnrollment record
 * by id.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateEnrollmentSchema.getCertificateEnrollmentById).
 * @param {string} req.body.id - The id of the certificate-enrollment link to retrieve.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the requested link and the rotated token.
 */
export const listOneCertificateEnrollment = async (req, res, next) => {
  const { id } = req.body;
  const certificateEnrollmentManager = new CertificateEnrollmentServices();

  try {
    const theLink = await certificateEnrollmentManager.listOne(id);

    return res.status(200).json({
      success: true,
      message: 'Vínculo certificado-matrícula encontrado exitosamente',
      certificateEnrollment: theLink,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar el vínculo certificado-matrícula en la base de datos',
    });
    next(boomError);
  }
};
