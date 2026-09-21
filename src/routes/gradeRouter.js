// ────────────────────────────────────────────────────────────────────────────
// GRADE ROUTER
// Entity: Grade | Table: grado
//
// Defines and exposes the HTTP endpoints used to manage the "grade"
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
// Mounted at: /app/v1/grades  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { gradeSchema } from '../schemas/gradeSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneGrade } from '../controllers/grade/create.js';
import { listAllGrades } from '../controllers/grade/listAll.js';
import { listOneGrade } from '../controllers/grade/listOne.js';
import { getGradeByName } from '../controllers/grade/getByName.js';
import { searchGradesByDescription } from '../controllers/grade/searchByDescription.js';
import { updateOneGrade } from '../controllers/grade/update.js';
import { deleteOneGrade } from '../controllers/grade/delete.js';

// Create a new Router instance dedicated to the grade resource
const gradeRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new grade
// Body: { name, description }
// ─────────────────────────────────────────────────────────────────────────────
gradeRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(gradeSchema.newGradeData, 'body'),
  createOneGrade
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every grade (ordered by ENUM sequence)
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
gradeRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  listAllGrades
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single grade by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
gradeRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(gradeSchema.getGradeById, 'body'),
  listOneGrade
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-name  →  Retrieve a single grade by its exact name (ENUM)
// Body: { name }
// ─────────────────────────────────────────────────────────────────────────────
gradeRouter.post(
  '/get-by-name',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(gradeSchema.getGradeByName, 'body'),
  getGradeByName
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-description  →  Search grades by partial description
// Body: { partialDescription }
// ─────────────────────────────────────────────────────────────────────────────
gradeRouter.post(
  '/search-by-description',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(gradeSchema.searchGradesByDescription, 'body'),
  searchGradesByDescription
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing grade
// Body: { id, name?, description? }
// ─────────────────────────────────────────────────────────────────────────────
gradeRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(gradeSchema.updateGradeData, 'body'),
  updateOneGrade
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a grade by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
gradeRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(gradeSchema.deleteGrade, 'body'),
  deleteOneGrade
);

export default gradeRouter;
