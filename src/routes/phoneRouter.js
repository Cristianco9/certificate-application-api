// ────────────────────────────────────────────────────────────────────────────
// PHONE ROUTER
// Entity: Phone | Table: telefono
//
// Defines and exposes the HTTP endpoints used to manage the "phone"
// catalog. Phones are shared records that can be linked to different
// actors (User, Student, Institution, CertificateRecipient) through
// bridge tables, but the Phone service itself only manages the phone
// records (CRUD and search), not the ownership relationships.
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
// Mounted at: /app/v1/phones  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { phoneSchema } from '../schemas/phoneSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOnePhone } from '../controllers/phone/create.js';
import { updateOnePhone } from '../controllers/phone/update.js';
import { deleteOnePhone } from '../controllers/phone/delete.js';
import { listOnePhone } from '../controllers/phone/listOne.js';
import { listAllPhones } from '../controllers/phone/listAll.js';
import { getPhoneByNumber } from '../controllers/phone/listByNumber.js';
import { searchPhonesByNumber } from '../controllers/phone/searchByNumber.js';

// Create a new Router instance dedicated to the phone resource
const phoneRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new phone
// Body: { number }
// ─────────────────────────────────────────────────────────────────────────────
phoneRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(phoneSchema.newPhoneData, 'body'),
  createOnePhone
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every phone
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
phoneRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  listAllPhones
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single phone by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
phoneRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(phoneSchema.getPhoneById, 'body'),
  listOnePhone
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-number  →  Retrieve a phone by exact number
// Body: { number }
// ─────────────────────────────────────────────────────────────────────────────
phoneRouter.post(
  '/get-by-number',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(phoneSchema.getPhoneByNumber, 'body'),
  getPhoneByNumber
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-number  →  Search phones by partial number
// Body: { partialNumber }
// ─────────────────────────────────────────────────────────────────────────────
phoneRouter.post(
  '/search-by-number',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(phoneSchema.searchPhonesByNumber, 'body'),
  searchPhonesByNumber
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update a phone number
// Body: { id, number }
// ─────────────────────────────────────────────────────────────────────────────
phoneRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(phoneSchema.updatePhoneData, 'body'),
  updateOnePhone
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a phone by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
phoneRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(phoneSchema.deletePhone, 'body'),
  deleteOnePhone
);

export default phoneRouter;
