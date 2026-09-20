// Import the DocumentTypeServices class to manage the document type operations
import { DocumentTypeServices } from '../../services/documentTypeServices.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve all document types.
 *
 * Delegates the lookup to DocumentTypeServices, which returns every
 * document type record ordered alphabetically by name, and responds
 * according to the outcome. This endpoint takes no input parameters,
 * so no validation schema is applied to it. The rotated JWT is not
 * signed here: authAppVerifyToken already generated it upstream, wrote
 * it to the httpOnly 'authentication' cookie, and exposed the same
 * value via res.locals.newUserToken for clients (e.g. the React SPA)
 * that also need the raw token in the body.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object used to send the outcome of the operation.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a JSON response with the list of document types and the rotated token.
 */
export const listAllDocumentTypes = async (req, res, next) => {
  // Instantiate the DocumentTypeServices class to manage the document type operations
  const documentTypeManager = new DocumentTypeServices();

  try {
    // Attempt to retrieve all document types
    const { total, records } = await documentTypeManager.listAll();

    return res.status(200).json({
      success: true,
      message: 'Tipos de documento encontrados exitosamente',
      total,
      documentTypes: records,
      // Echo the token already rotated by authAppVerifyToken
      authentication: res.locals.newUserToken,
    });
  } catch (error) {
    // DocumentTypeServices already throws boomified errors; boomify()
    // passes those through untouched and only defaults unexpected
    // errors to a 500.
    const boomError = Boom.boomify(error, {
      message: 'No es posible consultar los tipos de documento en la base de datos',
    });
    next(boomError);
  }
};
