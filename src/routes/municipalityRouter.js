// ────────────────────────────────────────────────────────────────────────────
// MUNICIPALITY ROUTER
// Entity: Municipality | Table: municipio
//
// Defines and exposes the HTTP endpoints used to manage the "municipality"
// catalog. This is an administrative catalog: every route is protected and
// only users whose JWT carries the appropriate role are allowed to operate
// on it.
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
// Mounted at: /app/v1/municipalities  (see src/routes/index.js)
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

// Joi schema collection for the municipality entity
import { municipalitySchema } from '../schemas/municipalitySchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneMunicipality } from '../controllers/municipality/create.js';
import { listAllMunicipalities } from '../controllers/municipality/listAll.js';
import { listOneMunicipality } from '../controllers/municipality/listOne.js';
import { listMunicipalitiesByPartialName } from '../controllers/municipality/listByPartialName.js';
import { listMunicipalitiesByDepartment } from '../controllers/municipality/listByDepartment.js';
import { updateOneMunicipality } from '../controllers/municipality/update.js';
import { deleteOneMunicipality } from '../controllers/municipality/delete.js';

// Create a new Router instance dedicated to the municipality resource
const municipalityRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new municipality
// Body: { name, departmentId }
// ─────────────────────────────────────────────────────────────────────────────
municipalityRouter.post(
  '/create',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the creation payload
  validatorHandler(municipalitySchema.newMunicipalityData, 'body'),
  // Step 5: delegate to the controller
  createOneMunicipality
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every municipality
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
municipalityRouter.get(
  '/list-all',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize all consuming roles
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  // Step 4: no schema — this endpoint takes no input parameters
  // Step 5: delegate to the controller
  listAllMunicipalities
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single municipality by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
municipalityRouter.post(
  '/list-one',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize all consuming roles
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  // Step 4: validate that a valid id was provided
  validatorHandler(municipalitySchema.getMunicipalityById, 'body'),
  // Step 5: delegate to the controller
  listOneMunicipality
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-name  →  Search municipalities by partial name
// Body: { partialName }
// ─────────────────────────────────────────────────────────────────────────────
municipalityRouter.post(
  '/search-by-name',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the partial search text
  validatorHandler(municipalitySchema.searchMunicipalitiesByName, 'body'),
  // Step 5: delegate to the controller
  listMunicipalitiesByPartialName
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-department  →  Retrieve every municipality belonging to a
// given department. Supports the cascading select flow (country ->
// department -> municipality).
// Body: { departmentId }
// ─────────────────────────────────────────────────────────────────────────────
municipalityRouter.post(
  '/get-by-department',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master, Administrator, and auxiliar roles
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  // Step 4: validate the department id
  validatorHandler(municipalitySchema.listMunicipalitiesByDepartment, 'body'),
  // Step 5: delegate to the controller
  listMunicipalitiesByDepartment
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing municipality
// Body: { id, name?, departmentId? }
// ─────────────────────────────────────────────────────────────────────────────
municipalityRouter.patch(
  '/update',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the update payload
  validatorHandler(municipalitySchema.updateMunicipalityData, 'body'),
  // Step 5: delegate to the controller
  updateOneMunicipality
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a municipality by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
municipalityRouter.delete(
  '/delete',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(municipalitySchema.deleteMunicipality, 'body'),
  // Step 5: delegate to the controller
  deleteOneMunicipality
);

// Export the configured router for registration in the main router (index.js)
export default municipalityRouter;
