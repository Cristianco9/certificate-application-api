// ────────────────────────────────────────────────────────────────────────────
// GENDER ROUTER
// Entity: Gender | Table: genero
//
// Defines and exposes the HTTP endpoints used to manage the "gender"
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
// Mounted at: /app/v1/genders  (see src/routes/index.js)
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

// Joi schema collection for the gender entity
import { genderSchema } from '../schemas/genderSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneGender } from '../controllers/gender/create.js';
import { listAllGenders } from '../controllers/gender/Listall.js';
import { listOneGender } from '../controllers/gender/Listone.js';
import { getGenderByName } from '../controllers/gender/Getbyname.js';
import { updateOneGender } from '../controllers/gender/update.js';
import { deleteOneGender } from '../controllers/gender/delete.js';

// Create a new Router instance dedicated to the gender resource
const genderRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new gender
// Body: { name }
// ─────────────────────────────────────────────────────────────────────────────
genderRouter.post(
  '/create',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the creation payload
  validatorHandler(genderSchema.newGenderData, 'body'),
  // Step 5: delegate to the controller
  createOneGender
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every gender
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
genderRouter.get(
  '/list-all',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize all consuming roles
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  // Step 4: no schema — this endpoint takes no input parameters
  // Step 5: delegate to the controller
  listAllGenders
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single gender by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
genderRouter.post(
  '/list-one',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(genderSchema.getGenderById, 'body'),
  // Step 5: delegate to the controller
  listOneGender
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-name  →  Retrieve a single gender by its exact name
// Body: { name }
// ─────────────────────────────────────────────────────────────────────────────
genderRouter.post(
  '/get-by-name',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the name
  validatorHandler(genderSchema.getGenderByName, 'body'),
  // Step 5: delegate to the controller
  getGenderByName
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing gender
// Body: { id, name }
// ─────────────────────────────────────────────────────────────────────────────
genderRouter.patch(
  '/update',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the update payload
  validatorHandler(genderSchema.updateGenderData, 'body'),
  // Step 5: delegate to the controller
  updateOneGender
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a gender by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
genderRouter.delete(
  '/delete',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(genderSchema.deleteGender, 'body'),
  // Step 5: delegate to the controller
  deleteOneGender
);

// Export the configured router for registration in the main router (index.js)
export default genderRouter;
