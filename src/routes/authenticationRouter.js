import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { userSchema } from '../schemas/userSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { login } from '../controllers/authentication/login.js';
import { resetPassword } from '../controllers/authentication/resetPassword.js';

// Create a new Router instance dedicated to the user resource
const authenticationRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /login  →  Authenticate a user and start a session
// Body: { credentials: { username, password } }
// ─────────────────────────────────────────────────────────────────────────────
authenticationRouter.post(
  '/login',
  checkApiKey,
  validatorHandler(userSchema.loginCredentials, 'body'),
  login
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /reset-password  →  Reset a user's password without an active session
// (the 'forgot password' flow: the user is NOT logged in and does not
// remember their current password, so there is no session token to verify
// or rotate). Identity is verified inside UserServices.resetPassword by
// requiring email AND documentNumber to both match the same user record —
// not by a JWT. After a successful reset, the user must log in again
// through POST /login using their new password.
// Body: { email, documentNumber, newPassword }
// ─────────────────────────────────────────────────────────────────────────────
authenticationRouter.post(
  '/reset-password',
  checkApiKey,
  validatorHandler(userSchema.resetPasswordData, 'body'),
  resetPassword
);

export default authenticationRouter;
