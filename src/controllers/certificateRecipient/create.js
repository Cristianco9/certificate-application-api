import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Creates a new certificate recipient.
 */
export const createOneCertificateRecipient = async (req, res, next) => {
  const newCertificateRecipient = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
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
