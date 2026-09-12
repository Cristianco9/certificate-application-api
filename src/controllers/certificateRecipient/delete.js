import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to delete a certificate recipient by id.
 *
 * Extracts the recipient id from the request body, delegates deletion to
 * CertificateRecipientServices, and responds according to the outcome.
 * The rotated JWT is provided via res.locals.newUserToken by authAppVerifyToken.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body.
 * @param {number|string} req.body.id - Identifier of the certificate recipient to delete.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the operation result and the rotated token.
 */
export const deleteOneCertificateRecipient = async (req, res, next) => {
  const { id } = req.body;
  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const response = await certificateRecipientManager.deleteOne(id);

    if (response.status === 'DELETED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Receptor del certificado eliminado exitosamente',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible eliminar el receptor del certificado de la base de datos',
    });
    next(boomError);
  }
};
