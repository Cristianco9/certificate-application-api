import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import {
  loginIpLimiter,
  loginAccountLimiter,
  resetPasswordIpLimiter,
  resetPasswordAccountLimiter,
} from '../middlewares/rateLimitHandler.js';
import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { userSchema } from '../schemas/userSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { login } from '../controllers/authentication/login.js';
import { getCurrentUser } from '../controllers/authentication/me.js';
import { resetPassword } from '../controllers/authentication/resetPassword.js';

// Create a new Router instance dedicated to the user resource
const authenticationRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /login  →  Authenticate a user and start a session
// Body: { credentials: { username, password } }
// ─────────────────────────────────────────────────────────────────────────────
authenticationRouter.post(
  '/login',
  loginIpLimiter,
  loginAccountLimiter,
  checkApiKey,
  validatorHandler(userSchema.loginCredentials, 'body'),
  login
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /me  →  Return the currently authenticated user's identity (id + role)
// Body: {} (no payload; identity is derived entirely from the verified JWT)
//
// Unlike /login and /reset-password, this endpoint REQUIRES an active
// session, so it runs through authAppVerifyToken. It deliberately does
// NOT run through checkRole: every authenticated user must be able to
// ask "who am I and what role do I have?" so the frontend can gate UI
// correctly. The role value returned is the raw JWT claim — one of
// 'Máster', 'Auxiliar', 'Administrador', 'Funcionario', 'Rector'.
// ─────────────────────────────────────────────────────────────────────────────
authenticationRouter.get(
  '/me',
  checkApiKey,
  authAppVerifyToken,
  getCurrentUser
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /reset-password  →  Reset a user's password without an active session
// (the 'forgot password' flow: the user is NOT logged in and does not
// remember their current password, so there is no session token to verify
// or rotate). Identity is verified inside AuthenticationServices.resetPassword
// by requiring email AND documentNumber to both match the same user record —
// not by a JWT. After a successful reset, the user must log in again
// through POST /login using their new password.
// Body: { email, documentNumber, newPassword }
// ─────────────────────────────────────────────────────────────────────────────
authenticationRouter.post(
  '/reset-password',
  resetPasswordIpLimiter,
  resetPasswordAccountLimiter,
  checkApiKey,
  validatorHandler(userSchema.resetPasswordData, 'body'),
  resetPassword
);

export default authenticationRouter;
