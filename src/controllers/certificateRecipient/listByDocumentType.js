import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Retrieves every certificate recipient matching a given document type.
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
