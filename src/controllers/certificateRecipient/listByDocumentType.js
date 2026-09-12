import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to list certificate recipients by document type.
 *
 * Extracts the document type id from the request body, delegates filtering to
 * CertificateRecipientServices, and returns all matching recipients.
 * The rotated JWT is provided via res.locals.newUserToken by authAppVerifyToken.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body.
 * @param {number|string} req.body.documentTypeId - Document type identifier to filter by.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with matching certificate recipients and the rotated token.
 */
export const listCertificateRecipientsByDocumentType = async (req, res, next) => {
  const { documentTypeId } = req.body;
  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const certificateRecipients = await certificateRecipientManager.listByDocumentType(documentTypeId);

    return res.status(200).json({
      success: true,
      message: 'Receptores del certificado encontrados exitosamente',
      certificateRecipients,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los receptores del certificado para el tipo de documento indicado',
    });
    next(boomError);
  }
};
