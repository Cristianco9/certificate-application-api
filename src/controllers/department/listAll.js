// Import the DepartmentServices class to manage the department operations
import { DepartmentServices } from '../../services/departmentServices.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every department, ordered alphabetically.
 *
 * This endpoint takes no input, so no validation schema is applied to it
 * (see departmentSchema.js).
 *
 * The rotated JWT is not signed here: authAppVerifyToken already
 * generated it upstream, wrote it to the httpOnly 'authentication'
 * cookie, and exposed the same value via res.locals.newUserToken for
 * clients (e.g. the React SPA) that also need the raw token in the body.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object used to send the outcome of the operation.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the list of departments and the rotated token.
 */
export const listAllDepartments = async (req, res, next) => {
  // Instantiate the DepartmentServices class to manage the department operations
  const departmentManager = new DepartmentServices();

  try {
    // Attempt to retrieve every department
    const { total, records } = await departmentManager.listAll();

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
      message: 'No es posible consultar los departamentos en la base de datos',
    });
    next(boomError);
  }
};
