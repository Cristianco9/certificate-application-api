import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve a single certificate recipient by id.
 *
 * Extracts the recipient id from the request body, delegates lookup to
 * CertificateRecipientServices, and returns the matching recipient.
 * The rotated JWT is provided via res.locals.newUserToken by authAppVerifyToken.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body.
 * @param {number|string} req.body.id - Identifier of the certificate recipient to retrieve.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching recipient and the rotated token.
 */
export const listOneCertificateRecipient = async (req, res, next) => {
  const { id } = req.body;
  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const theCertificateRecipient = await certificateRecipientManager.listOne(id);

    return res.status(200).json({
      success: true,
      message: 'Receptor del certificado encontrado exitosamente',
      certificateRecipient: theCertificateRecipient,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar el receptor del certificado en la base de datos',
    });
    next(boomError);
  }
};
