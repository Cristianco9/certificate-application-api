import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Retrieves a single certificate recipient by id.
 */
export const listOneCertificateRecipient = async (req, res, next) => {
  const { id } = req.body;
  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const theCertificateRecipient = await certificateRecipientManager.listOne(id);

    return res.status(200).json({
      success: true,
      message: 'Receptor del certificado encontrado exitosamente',
      certificateRecipient: theCertificateRecipient,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar el receptor del certificado en la base de datos',
    });
    next(boomError);
  }
};
