import { CertificateServices } from '../../services/certificateServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to preview the act number that would be assigned
 * to the next certificate created today, WITHOUT creating it. Lets the
 * frontend display the next number before the user confirms.
 *
 * @param {Object} req - The Express request object (no body parameters required).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>}
 */
export const getNextCertificateActNumber = async (req, res, next) => {
  const certificateManager = new CertificateServices();

  try {
    const { actNumber } = await certificateManager.previewNextActNumber();

    return res.status(200).json({
      success: true,
      message: 'Próximo número de acta calculado exitosamente',
      actNumber,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible calcular el próximo número de acta',
    });
    next(boomError);
  }
};
