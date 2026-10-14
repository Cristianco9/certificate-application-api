// ────────────────────────────────────────────────────────────────────────────
// INSTITUTION PHONE ROUTER
// Entity: InstitutionPhone | Table: institucion_telefono
//
// Defines and exposes the HTTP endpoints used to manage the
// "institution-phone" bridge table. This bridge links an Institution to
// one of its Phone records. Unlike PhoneServices (which exposes the
// phone catalog itself and the generic owner-linking methods), this
// router is scoped exclusively to the Institution side of the ownership
// relationship.
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
// Role policy: since institutions are administrative entities managed by
// the system (not owned by individual users), mutations are restricted
// to the privileged roles — matching how institutionRouter.js itself
// gates its write endpoints — while reads are open to every authenticated
// role that needs to consult institution contact information.
//
// Mounted at: /app/v1/institution-phones  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { institutionPhoneSchema } from '../schemas/institutionPhoneSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneInstitutionPhone } from '../controllers/institutionPhone/create.js';
import { deleteOneInstitutionPhone } from '../controllers/institutionPhone/delete.js';
import { unlinkInstitutionPhone } from '../controllers/institutionPhone/unlinkByInstitutionAndPhone.js';
import { listOneInstitutionPhone } from '../controllers/institutionPhone/listOne.js';
import { listAllInstitutionPhones } from '../controllers/institutionPhone/listAll.js';
import { listInstitutionPhonesByInstitution } from '../controllers/institutionPhone/listByInstitution.js';
import { listInstitutionPhonesByPhone } from '../controllers/institutionPhone/listByPhone.js';
import { getInstitutionPhoneByInstitutionAndPhone } from '../controllers/institutionPhone/getByInstitutionAndPhone.js';

// Create a new Router instance dedicated to the institution-phone resource
const institutionPhoneRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Link a phone to an institution
// Body: { institutionId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
institutionPhoneRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(institutionPhoneSchema.newInstitutionPhoneData, 'body'),
  createOneInstitutionPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every institution-phone link
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
institutionPhoneRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  listAllInstitutionPhones
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single institution-phone link by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
institutionPhoneRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(institutionPhoneSchema.getInstitutionPhoneById, 'body'),
  listOneInstitutionPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-institution  →  List every phone linked to a given institution
// Body: { institutionId }
// ─────────────────────────────────────────────────────────────────────────────
institutionPhoneRouter.post(
  '/get-by-institution',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(institutionPhoneSchema.listInstitutionPhonesByInstitution, 'body'),
  listInstitutionPhonesByInstitution
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-phone  →  List every institution linked to a given phone
// Body: { phoneId }
// ─────────────────────────────────────────────────────────────────────────────
institutionPhoneRouter.post(
  '/get-by-phone',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(institutionPhoneSchema.listInstitutionPhonesByPhone, 'body'),
  listInstitutionPhonesByPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-institution-and-phone  →  Retrieve the link (if any) between
// a specific institution and a specific phone
// Body: { institutionId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
institutionPhoneRouter.post(
  '/get-by-institution-and-phone',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(institutionPhoneSchema.getInstitutionPhoneByInstitutionAndPhone, 'body'),
  getInstitutionPhoneByInstitutionAndPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete an institution-phone link by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
institutionPhoneRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(institutionPhoneSchema.deleteInstitutionPhone, 'body'),
  deleteOneInstitutionPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /unlink  →  Delete an institution-phone link by composite key
// (institutionId + phoneId). Convenience endpoint for callers that already
// hold both FK values.
// Body: { institutionId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
institutionPhoneRouter.delete(
  '/unlink',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(institutionPhoneSchema.unlinkInstitutionPhone, 'body'),
  unlinkInstitutionPhone
);

export default institutionPhoneRouter;
