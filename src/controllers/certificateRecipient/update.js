import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Updates an existing certificate recipient.
 */
export const updateOneCertificateRecipient = async (req, res, next) => {
  const { id } = req.body;
  const newCertificateRecipientData = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
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
