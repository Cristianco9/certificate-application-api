import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Retrieves every certificate recipient.
 */
export const listAllCertificateRecipients = async (req, res, next) => {
  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const allCertificateRecipients = await certificateRecipientManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Receptores del certificado encontrados exitosamente',
      certificateRecipients: allCertificateRecipients,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los receptores del certificado en la base de datos',
    });
    next(boomError);
  }
};
