// Import the CountryServices class to manage country-related database operations
import { CountryServices } from '../../services/countryServices.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to search countries whose name partially matches
 * the provided text. Supports the multi-criteria student/country search
 * requirement described in context.md ('Nombre parcial').
 *
 * The rotated JWT is not signed here: authAppVerifyToken already
 * generated it upstream, wrote it to the httpOnly 'authentication'
 * cookie, and exposed the same value via res.locals.newUserToken for
 * clients (e.g. the React SPA) that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see countrySchema.searchCountriesByName).
 * @param {string} req.body.partialName - The partial name to search for.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 *
 * @returns {Promise<void>} - Sends a JSON response with the matching countries and the rotated token.
 */
export const searchCountriesByName = async (req, res, next) => {
  // Extract the partial search text from the request body
  const { partialName } = req.body;

  // Instantiate the service that manages country operations
  const countryManager = new CountryServices();

  try {
    // Attempt to find countries matching the partial name
    const { total, records } = await countryManager.listByPartialName(partialName);

    return res.status(200).json({
      success: true,
      message: 'Búsqueda de países realizada exitosamente',
      total,
      countries: records,
      // Echo the token already rotated by authAppVerifyToken
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    // CountryServices already throws boomified errors; boomify() passes
    // those through untouched and only defaults unexpected errors to a 500.
    const boomError = Boom.boomify(error, {
      message: 'No es posible buscar los países',
    });
    next(boomError);
  }
};
