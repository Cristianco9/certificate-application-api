// Import the CountryServices class to manage country-related database operations
import { CountryServices } from '../../services/countryServices.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every country, ordered alphabetically
 * by name.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already
 * generated it upstream, wrote it to the httpOnly 'authentication'
 * cookie, and exposed the same value via res.locals.newUserToken for
 * clients (e.g. the React SPA) that also need the raw token in the body.
 *
 * @param {Object} req - The Express request object (no body parameters required).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 *
 * @returns {Promise<void>} - Sends a JSON response with the full list of countries and the rotated token.
 */
export const listAllCountries = async (req, res, next) => {
  // Instantiate the service that manages country operations
  const countryManager = new CountryServices();

  try {
    // Attempt to retrieve all countries
    const { total, records } = await countryManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Países encontrados exitosamente',
      total,
      countries: records,
      // Echo the token already rotated by authAppVerifyToken
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    // CountryServices already throws boomified errors; boomify() passes
    // those through untouched and only defaults unexpected errors to a 500.
    const boomError = Boom.boomify(error, {
      message: 'No es posible encontrar los países',
    });
    next(boomError);
  }
};
