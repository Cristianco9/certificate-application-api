// ────────────────────────────────────────────────────────────────────────────
// DOCUMENT TYPE ROUTER
// Entity: DocumentType | Table: tipo_documento
//
// Defines and exposes the HTTP endpoints used to manage the "document type"
// catalog. This is an administrative catalog: every route is protected and
// only users whose JWT carries the appropriate role are allowed to operate
// on it. Unlike Country/Department/Municipality, 'name' is backed by a
// closed ENUM (see documentTypeRegEx.js), so there is no partial-text
// search endpoint here — only the exact 'get-by-name' lookup.
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
// Mounted at: /app/v1/document-types  (see src/routes/index.js)
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

// Joi schema collection for the document type entity
import { documentTypeSchema } from '../schemas/documentTypeSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneDocumentType } from '../controllers/documentType/create.js';
import { listAllDocumentTypes } from '../controllers/documentType/listAll.js';
import { listOneDocumentType } from '../controllers/documentType/listOne.js';
import { listDocumentTypeByName } from '../controllers/documentType/listByName.js';
import { updateOneDocumentType } from '../controllers/documentType/update.js';
import { deleteOneDocumentType } from '../controllers/documentType/delete.js';

// Create a new Router instance dedicated to the document type resource
const documentTypeRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new document type
// Body: { name }
// ─────────────────────────────────────────────────────────────────────────────
documentTypeRouter.post(
  '/create',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the creation payload
  validatorHandler(documentTypeSchema.newDocumentTypeData, 'body'),
  // Step 5: delegate to the controller
  createOneDocumentType
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every document type
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
documentTypeRouter.get(
  '/list-all',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize all consuming roles
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  // Step 4: no schema — this endpoint takes no input parameters
  // Step 5: delegate to the controller
  listAllDocumentTypes
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single document type by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
documentTypeRouter.post(
  '/list-one',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(documentTypeSchema.getDocumentTypeById, 'body'),
  // Step 5: delegate to the controller
  listOneDocumentType
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-name  →  Retrieve a single document type by its exact name.
// 'name' is a closed ENUM, so this is an exact lookup, not a partial
// search — DocumentType has no 'search-by-name' endpoint.
// Body: { name }
// ─────────────────────────────────────────────────────────────────────────────
documentTypeRouter.post(
  '/get-by-name',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the exact name to search for
  validatorHandler(documentTypeSchema.getDocumentTypeByName, 'body'),
  // Step 5: delegate to the controller
  listDocumentTypeByName
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing document type
// Body: { id, name }
// ─────────────────────────────────────────────────────────────────────────────
documentTypeRouter.patch(
  '/update',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the update payload
  validatorHandler(documentTypeSchema.updateDocumentTypeData, 'body'),
  // Step 5: delegate to the controller
  updateOneDocumentType
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a document type by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
documentTypeRouter.delete(
  '/delete',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(documentTypeSchema.deleteDocumentType, 'body'),
  // Step 5: delegate to the controller
  deleteOneDocumentType
);

// Export the configured router for registration in the main router (index.js)
export default documentTypeRouter;
