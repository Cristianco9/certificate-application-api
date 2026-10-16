import { CertificateEnrollmentServices } from '../../services/certificateEnrollmentServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to delete a CertificateEnrollment record by id.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateEnrollmentSchema.deleteCertificateEnrollment).
 * @param {string} req.body.id - The id of the certificate-enrollment link to delete.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the operation result and the rotated token.
 */
export const deleteOneCertificateEnrollment = async (req, res, next) => {
  const { id } = req.body;
  const certificateEnrollmentManager = new CertificateEnrollmentServices();

  try {
    const response = await certificateEnrollmentManager.deleteOne(id);

    if (response.status === 'DELETED SUCCESSFULLY') {
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
