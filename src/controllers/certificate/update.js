import { CertificateServices } from '../../services/certificateServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to update an existing certificate. Only
 * 'issueDate', 'recipientId' and 'status' are mutable — the identity
 * fields (userId, institutionId, enrollmentId) and the act number are
 * immutable.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see certificateSchema.updateCertificateData).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>}
 */
export const updateOneCertificate = async (req, res, next) => {
  const { id } = req.body;
  const newCertificateData = {
    issueDate: req.body.issueDate,
    recipientId: req.body.recipientId,
    status: req.body.status,
  };

  const certificateManager = new CertificateServices();

  try {
    const response = await certificateManager.updateOne(id, newCertificateData);

    if (response.status === 'UPDATED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Certificado actualizado exitosamente',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible actualizar el certificado en la base de datos',
    });
    next(boomError);
  }
};
