// ────────────────────────────────────────────────────────────────────────────
// SUBJECT ROUTER
// Entity: Subject | Table: asignatura
//
// Defines and exposes the HTTP endpoints used to manage the "subject"
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
// Mounted at: /app/v1/subjects  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { subjectSchema } from '../schemas/subjectSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneSubject } from '../controllers/subject/create.js';
import { updateOneSubject } from '../controllers/subject/update.js';
import { deleteOneSubject } from '../controllers/subject/delete.js';
import { listOneSubject } from '../controllers/subject/listOne.js';
import { listAllSubjects } from '../controllers/subject/listAll.js';
import { searchSubjectsByName } from '../controllers/subject/searchByName.js';

// Create a new Router instance dedicated to the subject resource
const subjectRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new subject
// Body: { name, description, hourlyIntensity }
// ─────────────────────────────────────────────────────────────────────────────
subjectRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(subjectSchema.newSubjectData, 'body'),
  createOneSubject
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every subject (ordered alphabetically by name)
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
subjectRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  listAllSubjects
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single subject by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
subjectRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(subjectSchema.getSubjectById, 'body'),
  listOneSubject
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-name  →  Search subjects by partial name
// Body: { partialName }
// ─────────────────────────────────────────────────────────────────────────────
subjectRouter.post(
  '/search-by-name',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(subjectSchema.searchSubjectsByName, 'body'),
  searchSubjectsByName
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing subject
// Body: { id, name?, description?, hourlyIntensity? }
// ─────────────────────────────────────────────────────────────────────────────
subjectRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(subjectSchema.updateSubjectData, 'body'),
  updateOneSubject
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a subject by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
subjectRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(subjectSchema.deleteSubject, 'body'),
  deleteOneSubject
);

export default subjectRouter;
