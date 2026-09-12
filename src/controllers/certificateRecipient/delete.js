import { CertificateRecipientServices } from '../../services/certificateRecipientServices.js';
import Boom from '@hapi/boom';

/**
 * Deletes a certificate recipient by id.
 */
export const deleteOneCertificateRecipient = async (req, res, next) => {
  const { id } = req.body;
  const certificateRecipientManager = new CertificateRecipientServices();

  try {
    const response = await certificateRecipientManager.deleteOne(id);

    if (response.status === 'DELETED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Receptor del certificado eliminado exitosamente',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible eliminar el receptor del certificado de la base de datos',
    });
    next(boomError);
  }
};
