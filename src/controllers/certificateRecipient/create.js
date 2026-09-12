import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to create a new certificate recipient.
 *
 * Extracts the new certificate recipient data from the request body, delegates
 * creation to CertificateRecipientServices, and responds according to the outcome.
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream,
 * wrote it to the httpOnly 'authentication' cookie, and exposed the same value via
 * res.locals.newUserToken for clients that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body.
 * @param {string} req.body.firstName - Recipient's first name.
 * @param {string} [req.body.middleName] - Recipient's middle name (optional).
 * @param {string} req.body.lastName - Recipient's last name.
 * @param {string} [req.body.secondLastName] - Recipient's second last name (optional).
 * @param {number|string} req.body.documentTypeId - Document type identifier.
 * @param {string} req.body.documentNumber - Recipient's document number.
 * @param {string} req.body.address - Recipient's address.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the operation result and the rotated token.
 */
export const createOneCertificateRecipient = async (req, res, next) => {
  const newCertificateRecipient = {
    firstName: req.body.firstName,
    middleName: req.body.middleName,
    lastName: req.body.lastName,
    secondLastName: req.body.secondLastName,
    documentTypeId: req.body.documentTypeId,
    documentNumber: req.body.documentNumber,
    address: req.body.address,
  };

  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const response = await certificateRecipientManager.createOne(newCertificateRecipient);

    if (response.status === 'CREATED SUCCESSFULLY') {
      return res.status(201).json({
        success: true,
        message: 'Receptor del certificado creado exitosamente',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible crear el receptor del certificado en la base de datos',
    });
    next(boomError);
  }
};
