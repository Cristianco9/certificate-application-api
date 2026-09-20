// Import the MunicipalityServices class to manage the municipality operations
import { MunicipalityServices } from '../../services/municipalityServices.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to search municipalities whose name partially
 * matches the given text. Supports the multi-criteria student search
 * requirement described in context.md ('Nombre parcial').
 *
 * The rotated JWT is not signed here: authAppVerifyToken already
 * generated it upstream, wrote it to the httpOnly 'authentication'
 * cookie, and exposed the same value via res.locals.newUserToken for
 * clients (e.g. the React SPA) that also need the raw token in the body.
 *
 * @param {Object} req - The request object containing the partial name to search for.
 * @param {Object} req.body - The validated request body (see municipalitySchema.searchMunicipalitiesByName).
 * @param {string} req.body.partialName - The partial municipality name to search for.
 * @param {Object} res - The response object used to send the outcome of the operation.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching municipalities and the rotated token.
 */
export const listMunicipalitiesByPartialName = async (req, res, next) => {
  // Extract the partial name to search for
  const { partialName } = req.body;

  // Instantiate the MunicipalityServices class to manage the municipality operations
  const municipalityManager = new MunicipalityServices();

  try {
    // Attempt to find municipalities matching the partial name
    const { total, records } = await municipalityManager.listByPartialName(partialName);

    return res.status(200).json({
      success: true,
      message: 'Municipios encontrados exitosamente',
      total,
      municipalities: records,
      // Echo the token already rotated by authAppVerifyToken
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    // MunicipalityServices already throws boomified errors; boomify()
    // passes those through untouched and only defaults unexpected
    // errors to a 500.
    const boomError = Boom.boomify(error, {
      message: 'No es posible buscar los municipios en la base de datos',
    });
    next(boomError);
  }
};
