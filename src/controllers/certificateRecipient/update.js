import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to update an existing certificate recipient.
 *
 * Extracts the recipient id and updated data from the request body, delegates
 * the update to CertificateRecipientServices, and responds according to the outcome.
 * The rotated JWT is provided via res.locals.newUserToken by authAppVerifyToken.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body.
 * @param {number|string} req.body.id - Identifier of the certificate recipient to update.
 * @param {string} req.body.firstName - Updated first name.
 * @param {string} [req.body.middleName] - Updated middle name (optional).
 * @param {string} req.body.lastName - Updated last name.
 * @param {string} [req.body.secondLastName] - Updated second last name (optional).
 * @param {number|string} req.body.documentTypeId - Updated document type identifier.
 * @param {string} req.body.documentNumber - Updated document number.
 * @param {string} req.body.address - Updated address.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the operation result and the rotated token.
 */
export const updateOneCertificateRecipient = async (req, res, next) => {
  const { id } = req.body;
  const newCertificateRecipientData = {
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
    const response = await certificateRecipientManager.updateOne(id, newCertificateRecipientData);

    if (response.status === 'UPDATED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Receptor del certificado actualizado exitosamente',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible actualizar el receptor del certificado en la base de datos',
    });
    next(boomError);
  }
};
