// Import the DepartmentServices class to manage the department operations
import { DepartmentServices } from '../../services/departmentServices.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every department belonging to a
 * given country. Supports cascading selects in the UI
 * (country -> department -> municipality).
 *
 * The rotated JWT is not signed here: authAppVerifyToken already
 * generated it upstream, wrote it to the httpOnly 'authentication'
 * cookie, and exposed the same value via res.locals.newUserToken for
 * clients (e.g. the React SPA) that also need the raw token in the body.
 *
 * @param {Object} req - The request object containing the country id.
 * @param {Object} res - The response object used to send the outcome of the operation.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching departments and the rotated token.
 */
export const listDepartmentsByCountry = async (req, res, next) => {
  // Extract the country id to filter by
  const { countryId } = req.body;

  // Instantiate the DepartmentServices class to manage the department operations
  const departmentManager = new DepartmentServices();

  try {
    // Attempt to find departments belonging to the given country
    const { total, records } = await departmentManager.listByCountry(countryId);

    return res.status(200).json({
      success: true,
      message: 'Departamentos encontrados exitosamente',
      total,
      departments: records,
      // Echo the token already rotated by authAppVerifyToken
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    // DepartmentServices already throws boomified errors; boomify()
    // passes those through untouched and only defaults unexpected
    // errors to a 500.
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los departamentos para el país indicado',
    });
    next(boomError);
  }
};
