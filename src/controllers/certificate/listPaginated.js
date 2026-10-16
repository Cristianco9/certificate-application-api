import { CertificateServices } from '../../services/certificateServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to list certificates for the repository page,
 * with offset/limit pagination and optional filters.
 *
 * The route sits at `POST /certificates/list-paginated`, is protected
 * by the same role set as the rest of the certificate flow
 * (Máster, Administrador, Rector, Secretario), and returns:
 *
 *   {
 *     success, message,
 *     total,           // total matching the filters (not the page size)
 *     offset, limit,   // echoed back so the client can reconcile state
 *     certificates,    // the page's records
 *     authentication,  // rotated JWT
 *   }
 *
 * @param {Object} req
 * @param {Object} req.body
 * @param {number} [req.body.offset=0]
 * @param {number} [req.body.limit=20]
 * @param {Object} [req.body.filters]
 * @param {Object} res
 * @param {string} res.locals.newUserToken
 * @param {Function} next
 * @returns {Promise<void>}
 */
export const listCertificatesPaginated = async (req, res, next) => {
  const offset = req.body.offset ?? 0;
  const limit = req.body.limit ?? 20;
  const filters = req.body.filters ?? {};

  const certificateManager = new CertificateServices();

  try {
    const {
      total,
      records,
      offset: appliedOffset,
      limit: appliedLimit,
    } = await certificateManager.listForRepository({ offset, limit, filters });

    return res.status(200).json({
      success: true,
      message: 'Certificados encontrados exitosamente',
      total,
      offset: appliedOffset,
      limit: appliedLimit,
      certificates: records,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los certificados del repositorio',
    });
    next(boomError);
  }
};
