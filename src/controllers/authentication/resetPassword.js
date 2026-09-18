import { AuthenticationServices } from '../../services/AuthenticationServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to reset a user's password when they cannot log
 * in and do not remember their current password.
 *
 * Since the user is not authenticated at this point, there is no
 * session and no JWT is signed, verified, or rotated here — this
 * endpoint sits outside the authAppVerifyToken pipeline entirely.
 * Identity is verified by the service using two independent unique
 * fields (email + documentNumber) that must both match the same user
 * record before the password is replaced.
 *
 * After a successful reset, the user must log in again through the
 * normal /auth/login endpoint with their new password.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see userSchema.resetPasswordData).
 * @param {string} req.body.email - The user's registered email.
 * @param {string} req.body.documentNumber - The user's registered document number.
 * @param {string} req.body.newPassword - The new plain-text password to set.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function in the Express.js stack.
 *
 * @returns {Promise<void>} - Sends a JSON response confirming the password was reset.
 */
export const resetPassword = async (req, res, next) => {
  // Extract the identity-verification fields and the new password from the request body
  const { email, documentNumber, newPassword } = req.body;

  // Instantiate the service that manages user operations
  const AuthenticationManager = new AuthenticationServices();

  try {
    // Attempt to reset the password
    const response = await AuthenticationManager.resetPassword(email, documentNumber, newPassword);

    if (response.status === 'PASSWORD RESET SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Contraseña restablecida exitosamente. Por favor inicie sesión con su nueva contraseña.',
        // No 'authentication' field: this endpoint issues no token,
        // since the user is not (and should not be) logged in yet.
      });
    }
  } catch (error) {
    // AuthenticationServices.resetPassword already throws boomified errors (e.g.
    // notFound when email/documentNumber don't match the same user,
    // badRequest when the new password matches the old one); boomify()
    // passes those through untouched and only defaults unexpected
    // errors to a 500.
    const boomError = Boom.boomify(error, {
      message: 'No es posible restablecer la contraseña',
    });
    next(boomError);
  }
};
