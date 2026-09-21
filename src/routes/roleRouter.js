// ────────────────────────────────────────────────────────────────────────────
// ROLE ROUTER
// Entity: Role | Table: rol
//
// Defines and exposes the HTTP endpoints used to manage the "role"
// catalog. This entity also drives role-based access control across the
// application (see AGENTS.md section 7), so every route is protected and
// only users whose JWT carries the appropriate role are allowed to
// operate on it.
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
// Mounted at: /app/v1/roles  (see src/routes/index.js)
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

// Joi schema collection for the role entity
import { roleSchema } from '../schemas/roleSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneRole } from '../controllers/role/create.js';
import { listAllRoles } from '../controllers/role/Listall.js';
import { listOneRole } from '../controllers/role/Listone.js';
import { getRoleByName } from '../controllers/role/Getbyname.js';
import { searchRolesByDescription } from '../controllers/role/Searchbydescription.js';
import { updateOneRole } from '../controllers/role/update.js';
import { deleteOneRole } from '../controllers/role/delete.js';

// Create a new Router instance dedicated to the role resource
const roleRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new role
// Body: { name, description }
// ─────────────────────────────────────────────────────────────────────────────
roleRouter.post(
  '/create',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster','Administrador']),
  // Step 4: validate the creation payload
  validatorHandler(roleSchema.newRoleData, 'body'),
  // Step 5: delegate to the controller
  createOneRole
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every role
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
roleRouter.get(
  '/list-all',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster','Administrador']),
  // Step 4: no schema — this endpoint takes no input parameters
  // Step 5: delegate to the controller
  listAllRoles
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single role by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
roleRouter.post(
  '/list-one',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster','Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(roleSchema.getRoleById, 'body'),
  // Step 5: delegate to the controller
  listOneRole
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-name  →  Retrieve a single role by its exact name
// Body: { name }
// ─────────────────────────────────────────────────────────────────────────────
roleRouter.post(
  '/get-by-name',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster','Administrador']),
  // Step 4: validate the name
  validatorHandler(roleSchema.getRoleByName, 'body'),
  // Step 5: delegate to the controller
  getRoleByName
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-description  →  Search roles by partial description
// Body: { partialDescription }
// ─────────────────────────────────────────────────────────────────────────────
roleRouter.post(
  '/search-by-description',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster','Administrador']),
  // Step 4: validate the partial search text
  validatorHandler(roleSchema.searchRolesByDescription, 'body'),
  // Step 5: delegate to the controller
  searchRolesByDescription
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing role
// Body: { id, name?, description? }
// ─────────────────────────────────────────────────────────────────────────────
roleRouter.patch(
  '/update',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster','Administrador']),
  // Step 4: validate the update payload
  validatorHandler(roleSchema.updateRoleData, 'body'),
  // Step 5: delegate to the controller
  updateOneRole
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a role by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
roleRouter.delete(
  '/delete',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster','Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(roleSchema.deleteRole, 'body'),
  // Step 5: delegate to the controller
  deleteOneRole
);

// Export the configured router for registration in the main router (index.js)
export default roleRouter;
