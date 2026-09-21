// ────────────────────────────────────────────────────────────────────────────
// USER ROUTER
// Entity: User | Table: usuario
//
// Defines and exposes the HTTP endpoints used to manage the "user"
// entity. Users are the actors of the system (Administrator, Rector,
// Academic Secretary, Auxiliary). This is an administrative catalog:
// every route is protected and only users whose JWT carries the
// appropriate role are allowed to operate on it.
//
// Security pipeline applied to each route (in this strict order, per
// AGENTS.md section 7):
//   1. validatorHandler(schema, 'body') → validates the incoming payload
//      (Joi). Never touches the database or downstream middlewares with
//      unvalidated data.
//   2. checkApiKey → verifies the client app's API key.
//   3. authAppVerifyToken → validates the session JWT and rotates it.
//   4. checkRole([...]) → authorizes only the allowed roles (when the
//      route requires role-based control, applied right after the token
//      check since it depends on the decoded JWT).
//   5. controller → executes the business operation and builds the response.
//
// Mounted at: /app/v1/users  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { userSchema } from '../schemas/userSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneUser } from '../controllers/user/create.js';
import { updateOneUser } from '../controllers/user/update.js';
import { deleteOneUser } from '../controllers/user/delete.js';
import { listOneUser } from '../controllers/user/listOne.js';
import { listAllUsers } from '../controllers/user/listAll.js';

// Create a new Router instance dedicated to the user resource
const userRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new user
// Body: { firstName, lastName, documentTypeId, documentNumber, municipalityId,
//         roleId, academicLevelId, email, status, password, genderId, lastLogin? }
// ─────────────────────────────────────────────────────────────────────────────
userRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(userSchema.newUserData, 'body'),
  createOneUser
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every user (passwords excluded)
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
userRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  listAllUsers
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single user by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
userRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(userSchema.getUserById, 'body'),
  listOneUser
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing user
// Body: { id, firstName?, lastName?, documentTypeId?, documentNumber?,
//         municipalityId?, roleId?, academicLevelId?, email?, status?,
//         password?, genderId?, lastLogin? }
// ─────────────────────────────────────────────────────────────────────────────
userRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(userSchema.updateUserData, 'body'),
  updateOneUser
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a user by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
userRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(userSchema.deleteUser, 'body'),
  deleteOneUser
);

export default userRouter;
