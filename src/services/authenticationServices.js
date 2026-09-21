/**
 * @module services/authenticationService
 * @description Service layer for user authentication.
 *
 * Handles credential-based login (returning a signed JWT) and unauthenticated
 * password reset. Password comparison and hashing are performed with bcrypt.
 */

// import the user data model
import { User } from '../db/models/user.js';
// import the related catalog models needed to embed FK data as nested objects
import { Role } from '../db/models/role.js';
// import the module to sign a JWT
import { signUserToken } from '../utils/auth/tokenSign.js';
// bcrypt takes care of hashing the user's password
import bcrypt from 'bcryptjs';
// import the promise to encrypt the user's password
import { hashPassword } from '../utils/auth/passwordHash.js';
// import the configuration module
import { config } from '../config/config.js'
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class for authentication-related operations.
 *
 * Encapsulates the two unauthenticated entry points of the auth flow:
 * logging in with username/password, and resetting a forgotten password
 * by verifying identity through other unique user fields.
 *
 * @class AuthenticationService
 */
export class AuthenticationServices {

  /**
   * Authenticates a user with a username and password.
   *
   * Only users whose status is 'ACTIVO' can log in. On success it updates
   * the user's `lastLogin` timestamp, resolves the user's role name, and
   * issues a signed JWT valid for one hour. The token payload carries the
   * user id and role name.
   *
   * Note: this method deliberately returns status objects (rather than
   * throwing) for the expected failure cases, so the caller can decide the
   * HTTP response. "user not found" and "wrong password" must be collapsed
   * by the caller into one generic response to prevent user enumeration.
   * "inactive user" is only returned AFTER the password has been verified,
   * so account status is never revealed to someone without valid credentials.
   *
   * @async
   * @param {string} username - The username supplied at login.
   * @param {string} password - The plain-text password supplied at login.
   * @returns {Promise<{status: string, token?: string}>} A result object whose
   * `status` is one of `'user not found'`, `'wrong password'`,
   * `'inactive user'`, or `'logged'`. When `status` is `'logged'`, a `token`
   * property with the signed JWT is also included.
   * @throws {Boom} Throws a wrapped Boom error if an unexpected failure occurs
   * while verifying credentials.
   */
  async login(username, password) {

    try {
      const userRecord = await User.findOne({ where: { username } });

      if (!userRecord) {
        return { status: 'user not found' };
      }

      const validPassword = await bcrypt.compare(password, userRecord.password);

      if (!validPassword) {
        return { status: 'wrong password' };
      }

      // Only active accounts can start a session. Checked after the
      // password so status is not disclosed to unauthenticated callers.
      if (userRecord.status !== 'ACTIVO') {
        return { status: 'inactive user' };
      }

      const role = await Role.findOne({ where: { id: userRecord.roleId } });

      // Defensive guard: without a role there is nothing to authorize with
      if (!role) {
        throw Boom.internal('The user has no valid role assigned');
      }

      await User.update(
        { lastLogin: new Date() },
        { where: { id: userRecord.id } }
      );

      const userToken = signUserToken(
        { id: userRecord.id, role: role.name },
        config.authAppJwtKey,
        '1h'
      );

      return { status: 'logged', token: userToken };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to verify user credentials' });
    }
  }


  /**
   * Resets a user's password when they can't log in and don't remember
   * their current password. Since the user isn't authenticated, this
   * does NOT verify the old password (there's nothing to compare
   * against from their side). Instead, it verifies identity using two
   * independent unique fields the user should know — email and document
   * number — before allowing the password to be replaced. No token is
   * issued or verified here: once the password is updated, the user
   * simply logs in again with their new password through the normal
   * login() flow.
   *
   * The new password is also rejected if it matches the user's current
   * password, to prevent a no-op reset.
   *
   * @async
   * @param {string} email - The user's registered email.
   * @param {string} documentNumber - The user's registered document number.
   * @param {string} newPassword - The new plain-text password to set.
   * @returns {Promise<{status: string}>} Result object with a success status message.
   * @throws {Boom} Throws `Boom.badRequest` if any argument is missing or if
   * the new password matches the current one, `Boom.notFound` if no user
   * matches the provided email and document number, or a wrapped Boom error
   * if the reset fails.
   */
  async resetPassword(email, documentNumber, newPassword) {

    if (!email || !documentNumber || !newPassword) {
      throw Boom.badRequest('Email, document number, and a new password must all be provided');
    }

    try {
      const existingUser = await User.findOne({
        where: { email, documentNumber }
      });

      if (!existingUser) {
        throw Boom.notFound('No user was found matching the provided email and document number');
      }

      const isSameAsOld = await bcrypt.compare(newPassword, existingUser.password);

      if (isSameAsOld) {
        throw Boom.badRequest('The new password must be different from the previous password');
      }

      const hash = await hashPassword(newPassword);

      await User.update(
        { password: hash },
        { where: { id: existingUser.id } }
      );

      return { status: 'PASSWORD RESET SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to reset the password' });
    }
  }
}
