import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to list every certificate recipient.
 *
 * Delegates retrieval to CertificateRecipientServices and returns the full collection.
 * The rotated JWT is provided via res.locals.newUserToken by authAppVerifyToken.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with all certificate recipients and the rotated token.
 */
export const listAllCertificateRecipients = async (req, res, next) => {
  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const allCertificateRecipients = await certificateRecipientManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Receptores del certificado encontrados exitosamente',
      certificateRecipients: allCertificateRecipients,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los receptores del certificado en la base de datos',
    });
    next(boomError);
  }
};
