import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Searches certificate recipients by partial name (first or last).
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
