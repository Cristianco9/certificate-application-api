import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to search certificate recipients by partial name.
 *
 * Extracts a partial first or last name from the request body, delegates the
 * search to CertificateRecipientServices, and returns all matching recipients.
 * The rotated JWT is provided via res.locals.newUserToken by authAppVerifyToken.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body.
 * @param {string} req.body.partialName - Partial first or last name to search for.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with matching certificate recipients and the rotated token.
 */
export const searchCertificateRecipientsByName = async (req, res, next) => {
  const { partialName } = req.body;
  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const matchingCertificateRecipients = await certificateRecipientManager.listByPartialName(partialName);

    return res.status(200).json({
      success: true,
      message: 'Búsqueda de receptores del certificado realizada exitosamente',
      certificateRecipients: matchingCertificateRecipients,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible buscar los receptores del certificado',
    });
    next(boomError);
  }
};
