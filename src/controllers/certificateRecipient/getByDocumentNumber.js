import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve a certificate recipient by exact document number.
 *
 * Extracts the document number from the request body, delegates lookup to
 * CertificateRecipientServices, and returns the matching recipient.
 * The rotated JWT is provided via res.locals.newUserToken by authAppVerifyToken.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body.
 * @param {string} req.body.documentNumber - Exact document number to search for.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching recipient and the rotated token.
 */
export const getCertificateRecipientByDocumentNumber = async (req, res, next) => {
  const { documentNumber } = req.body;
  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const theCertificateRecipient = await certificateRecipientManager.listByDocumentNumber(documentNumber);

    return res.status(200).json({
      success: true,
      message: 'Receptor del certificado encontrado exitosamente',
      certificateRecipient: theCertificateRecipient,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible encontrar el receptor del certificado por número de documento',
    });
    next(boomError);
  }
};
