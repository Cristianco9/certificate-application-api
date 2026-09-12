import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Retrieves a certificate recipient by its exact document number.
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
