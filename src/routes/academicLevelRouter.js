// ────────────────────────────────────────────────────────────────────────────
// ACADEMIC LEVEL ROUTER
// Entity: AcademicLevel | Table: nivel_academico
//
// Defines and exposes the HTTP endpoints used to manage the "academic
// level" catalog. This is an administrative catalog: every route is
// protected and only users whose JWT carries the appropriate role are
// allowed to operate on it.
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
// Mounted at: /app/v1/academic-levels  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

// Import the Router class from Express to create an isolated routing instance
import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

// Middleware that validates a request property against a Joi schema
import { validatorHandler } from '../middlewares/validatorHandler.js';
// Middleware that verifies the API key sent by the client app
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
// Middleware that verifies the authentication JWT and regenerates it on success
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
// Middleware factory that restricts access based on the user's role
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

// Joi schema collection for the academic level entity
import { academicLevelSchema } from '../schemas/academicLevelSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneAcademicLevel } from '../controllers/academicLevel/create.js';
import { listAllAcademicLevels } from '../controllers/academicLevel/Listall.js';
import { listOneAcademicLevel } from '../controllers/academicLevel/Listone.js';
import { getAcademicLevelByName } from '../controllers/academicLevel/Getbyname.js';
import { getAcademicLevelByAbbreviation } from '../controllers/academicLevel/Getbyabbreviation.js';
import { updateOneAcademicLevel } from '../controllers/academicLevel/update.js';
import { deleteOneAcademicLevel } from '../controllers/academicLevel/delete.js';

// Create a new Router instance dedicated to the academic level resource
const academicLevelRouter = Router();
// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new academic level
// Body: { name, abbreviation }
// ─────────────────────────────────────────────────────────────────────────────
academicLevelRouter.post(
  '/create',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the creation payload
  validatorHandler(academicLevelSchema.newAcademicLevelData, 'body'),
  // Step 5: delegate to the controller
  createOneAcademicLevel
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every academic level
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
academicLevelRouter.get(
  '/list-all',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: no schema — this endpoint takes no input parameters
  // Step 5: delegate to the controller
  listAllAcademicLevels
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single academic level by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
academicLevelRouter.post(
  '/list-one',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(academicLevelSchema.getAcademicLevelById, 'body'),
  // Step 5: delegate to the controller
  listOneAcademicLevel
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-name  →  Retrieve a single academic level by its exact name
// Body: { name }
// ─────────────────────────────────────────────────────────────────────────────
academicLevelRouter.post(
  '/get-by-name',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the name
  validatorHandler(academicLevelSchema.getAcademicLevelByName, 'body'),
  // Step 5: delegate to the controller
  getAcademicLevelByName
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-abbreviation  →  Retrieve a single academic level by its
// exact abbreviation
// Body: { abbreviation }
// ─────────────────────────────────────────────────────────────────────────────
academicLevelRouter.post(
  '/get-by-abbreviation',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the abbreviation
  validatorHandler(academicLevelSchema.getAcademicLevelByAbbreviation, 'body'),
  // Step 5: delegate to the controller
  getAcademicLevelByAbbreviation
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing academic level
// Body: { id, name?, abbreviation? }
// ─────────────────────────────────────────────────────────────────────────────
academicLevelRouter.patch(
  '/update',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the update payload
  validatorHandler(academicLevelSchema.updateAcademicLevelData, 'body'),
  // Step 5: delegate to the controller
  updateOneAcademicLevel
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete an academic level by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
academicLevelRouter.delete(
  '/delete',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(academicLevelSchema.deleteAcademicLevel, 'body'),
  // Step 5: delegate to the controller
  deleteOneAcademicLevel
);

// Export the configured router for registration in the main router (index.js)
export default academicLevelRouter;
