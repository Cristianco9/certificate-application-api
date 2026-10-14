// ────────────────────────────────────────────────────────────────────────────
// USER PHONE ROUTER
// Entity: UserPhone | Table: usuario_telefono
//
// Defines and exposes the HTTP endpoints used to manage the "user-phone"
// bridge table. This bridge links a User to one of their Phone records.
// Unlike PhoneServices (which exposes the phone catalog itself and the
// generic owner-linking methods), this router is scoped exclusively to
// the User side of the ownership relationship.
//
// Security pipeline applied to each route (in this strict order, per
// AGENTS.md section 7):
//   1. validatorHandler(schema, 'body') → validates the incoming payload
//      (Joi). Never touches the database or downstream middlewares with
//      unvalidated data.
//   2. checkApiKey → verifies the client app's API key.
//   3. authAppVerifyToken → validates the session JWT and rotates it.
//   4. checkRole([...]) → authorizes only the allowed roles (applied
//      right after the token check since it depends on the decoded JWT).
//   5. controller → executes the business operation and builds the response.
//
// Mounted at: /app/v1/user-phones  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { userPhoneSchema } from '../schemas/userPhoneSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneUserPhone } from '../controllers/userPhone/create.js';
import { deleteOneUserPhone } from '../controllers/userPhone/delete.js';
import { unlinkUserPhone } from '../controllers/userPhone/unlinkByUserAndPhone.js';
import { listOneUserPhone } from '../controllers/userPhone/listOne.js';
import { listAllUserPhones } from '../controllers/userPhone/listAll.js';
import { listUserPhonesByUser } from '../controllers/userPhone/listByUser.js';
import { listUserPhonesByPhone } from '../controllers/userPhone/listByPhone.js';
import { getUserPhoneByUserAndPhone } from '../controllers/userPhone/getByUserAndPhone.js';

// Create a new Router instance dedicated to the user-phone resource
const userPhoneRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Link a phone to a user
// Body: { userId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
userPhoneRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario', 'Auxiliar']),
  validatorHandler(userPhoneSchema.newUserPhoneData, 'body'),
  createOneUserPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every user-phone link
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
userPhoneRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  listAllUserPhones
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single user-phone link by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
userPhoneRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(userPhoneSchema.getUserPhoneById, 'body'),
  listOneUserPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-user  →  List every phone linked to a given user
// Body: { userId }
// ─────────────────────────────────────────────────────────────────────────────
userPhoneRouter.post(
  '/get-by-user',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario', 'Auxiliar']),
  validatorHandler(userPhoneSchema.listUserPhonesByUser, 'body'),
  listUserPhonesByUser
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-phone  →  List every user linked to a given phone
// Body: { phoneId }
// ─────────────────────────────────────────────────────────────────────────────
userPhoneRouter.post(
  '/get-by-phone',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(userPhoneSchema.listUserPhonesByPhone, 'body'),
  listUserPhonesByPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-user-and-phone  →  Retrieve the link (if any) between a
// specific user and a specific phone
// Body: { userId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
userPhoneRouter.post(
  '/get-by-user-and-phone',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(userPhoneSchema.getUserPhoneByUserAndPhone, 'body'),
  getUserPhoneByUserAndPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a user-phone link by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
userPhoneRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario', 'Auxiliar']),
  validatorHandler(userPhoneSchema.deleteUserPhone, 'body'),
  deleteOneUserPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /unlink  →  Delete a user-phone link by composite key (userId + phoneId)
// Convenience endpoint for callers that already hold both FK values.
// Body: { userId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
userPhoneRouter.delete(
  '/unlink',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario', 'Auxiliar']),
  validatorHandler(userPhoneSchema.unlinkUserPhone, 'body'),
  unlinkUserPhone
);

export default userPhoneRouter;
