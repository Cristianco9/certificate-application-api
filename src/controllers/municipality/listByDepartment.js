// Import the MunicipalityServices class to manage the municipality operations
import { MunicipalityServices } from '../../services/municipalityServices.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every municipality belonging to a
 * given department. Supports cascading selects in the UI
 * (country -> department -> municipality).
 *
 * The rotated JWT is not signed here: authAppVerifyToken already
 * generated it upstream, wrote it to the httpOnly 'authentication'
 * cookie, and exposed the same value via res.locals.newUserToken for
 * clients (e.g. the React SPA) that also need the raw token in the body.
 *
 * @param {Object} req - The request object containing the department id.
 * @param {Object} req.body - The validated request body (see municipalitySchema.listMunicipalitiesByDepartment).
 * @param {string} req.body.departmentId - The id of the department to filter by.
 * @param {Object} res - The response object used to send the outcome of the operation.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the matching municipalities and the rotated token.
 */
export const listMunicipalitiesByDepartment = async (req, res, next) => {
  // Extract the department id to filter by
  const { departmentId } = req.body;

  // Instantiate the MunicipalityServices class to manage the municipality operations
  const municipalityManager = new MunicipalityServices();

  try {
    // Attempt to find municipalities belonging to the given department
    const { total, records } = await municipalityManager.listByDepartment(departmentId);

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
      message: 'No es posible consultar los municipios para el departamento indicado',
    });
    next(boomError);
  }
};
