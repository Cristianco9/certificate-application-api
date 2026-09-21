// ────────────────────────────────────────────────────────────────────────────
// DEPARTMENT ROUTER
// Entity: Department | Table: departamento
//
// Defines and exposes the HTTP endpoints used to manage the "department"
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
// Mounted at: /app/v1/departments  (see src/routes/index.js)
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

// Joi schema collection for the department entity
import { departmentSchema } from '../schemas/departmentSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneDepartment } from '../controllers/department/create.js';
import { listAllDepartments } from '../controllers/department/ListAll.js';
import { listOneDepartment } from '../controllers/department/ListOne.js';
import { listDepartmentsByPartialName } from '../controllers/department/listByPartialName.js';
import { listDepartmentsByCountry } from '../controllers/department/listByCountry.js';
import { updateOneDepartment } from '../controllers/department/update.js';
import { deleteOneDepartment } from '../controllers/department/delete.js';

// Create a new Router instance dedicated to the department resource
const departmentRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new department
// Body: { name, countryId }
// ─────────────────────────────────────────────────────────────────────────────
departmentRouter.post(
  '/create',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the creation payload
  validatorHandler(departmentSchema.newDepartmentData, 'body'),
  // Step 5: delegate to the controller
  createOneDepartment
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every department
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
departmentRouter.get(
  '/list-all',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize all consuming roles
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  // Step 4: no schema — this endpoint takes no input parameters
  // Step 5: delegate to the controller
  listAllDepartments
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single department by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
departmentRouter.post(
  '/list-one',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize all consuming roles
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  // Step 4: validate that a valid id was provided
  validatorHandler(departmentSchema.getDepartmentById, 'body'),
  // Step 5: delegate to the controller
  listOneDepartment
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-name  →  Search departments by partial name
// Body: { partialName }
// ─────────────────────────────────────────────────────────────────────────────
departmentRouter.post(
  '/search-by-name',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the partial search text
  validatorHandler(departmentSchema.searchDepartmentsByName, 'body'),
  // Step 5: delegate to the controller
  listDepartmentsByPartialName
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-country  →  Retrieve every department belonging to a given
// country. Supports the cascading select flow (country -> department ->
// municipality).
// Body: { countryId }
// ─────────────────────────────────────────────────────────────────────────────
departmentRouter.post(
  '/get-by-country',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master, Administrator, and auxiliar roles
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  // Step 4: validate the country id
  validatorHandler(departmentSchema.listDepartmentsByCountry, 'body'),
  // Step 5: delegate to the controller
  listDepartmentsByCountry
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing department
// Body: { id, name?, countryId? }
// ─────────────────────────────────────────────────────────────────────────────
departmentRouter.patch(
  '/update',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the update payload
  validatorHandler(departmentSchema.updateDepartmentData, 'body'),
  // Step 5: delegate to the controller
  updateOneDepartment
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a department by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
departmentRouter.delete(
  '/delete',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(departmentSchema.deleteDepartment, 'body'),
  // Step 5: delegate to the controller
  deleteOneDepartment
);

// Export the configured router for registration in the main router (index.js)
export default departmentRouter;
