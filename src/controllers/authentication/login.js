/**
 * @module controllers/authenticationController
 * @description HTTP controller for authentication endpoints.
 *
 * Translates HTTP requests into AuthenticationServices calls, maps the
 * service's domain-level statuses to HTTP responses, and defers all
 * unexpected failures to the centralized Express error handler.
 */

import Boom from '@hapi/boom';
import { AuthenticationServices } from '../../services/AuthenticationServices.js';

/**
 * Authenticates a user and, on success, starts a session by storing the
 * issued JWT in an HTTP-only cookie.
 *
 * Expected authentication failures ("user not found" and "wrong password")
 * are collapsed into a single `401` response so that clients — and would-be
 * attackers — cannot enumerate which half of the credentials was wrong.
 * Any other outcome (unexpected service status, thrown Boom errors, DB
 * failures) is forwarded to the Express error handler via `next`.
 *
 * @async
 * @param {import('express').Request} req - Express request object.
 * @param {Object} req.body - Request body.
 * @param {Object} req.body.credentials - Login credentials.
 * @param {string} req.body.credentials.username - Username.
 * @param {string} req.body.credentials.password - Plain-text password.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<import('express').Response|void>} JSON response, or void
 * when the error is delegated to `next`.
 * @throws {Boom} Forwards `Boom.badRequest` when credentials are missing, and
 * any error raised by the service, via `next`.
 */
export const login = async (req, res, next) => {
  const credentials = req.body?.credentials ?? {};
  const { username, password } = credentials;

  if (!username || !password) {
    return next(
      Boom.badRequest('Username and password are required', {
        code: 'MISSING_CREDENTIALS',
      })
    );
  }

  const AuthenticationManager = new AuthenticationServices();

  try {
    const response = await AuthenticationManager.login(username, password);

    // Expected auth failure: collapse both cases into one response to
    // prevent user enumeration.
    if (
      response.status === 'user not found' ||
      response.status === 'wrong password'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
        error: 'INVALID_CREDENTIALS',
      });
    }

    // Authentication successful. The service has already produced the JWT.
    if (response.status === 'logged') {
      res.cookie('authentication', response.token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
      });
    }

    // Any other status is a contract violation: the service returned
    // something the controller does not know how to handle.
    throw Boom.internal('Unexpected authentication status', {
      code: 'AUTHENTICATION_ERROR',
      status: response.status,
    });
  } catch (error) {
    return next(error);
  }
};
