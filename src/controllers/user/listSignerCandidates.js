import { UserServices } from '../../services/userServices.js';
import Boom from '@hapi/boom';

export const listSignerCandidates = async (req, res, next) => {
  const userManager = new UserServices();

  try {
    const candidates = await userManager.listSignerCandidates();

    return res.status(200).json({
      success: true,
      message: 'Candidatos a firmante encontrados exitosamente',
      total: candidates.length,
      users: candidates,
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los candidatos a firmante',
    });
    next(boomError);
  }
};
