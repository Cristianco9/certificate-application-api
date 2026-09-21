// ────────────────────────────────────────────────────────────────────────────
// SCORE ROUTER
// Entity: Score | Table: calificacion
//
// Defines and exposes the HTTP endpoints used to manage the "score"
// entity. Scores represent the grades obtained by a student in a specific
// subject within an enrollment.
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
// Mounted at: /app/v1/scores  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { scoreSchema } from '../schemas/scoreSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneScore } from '../controllers/score/create.js';
import { updateOneScore } from '../controllers/score/update.js';
import { deleteOneScore } from '../controllers/score/delete.js';
import { listOneScore } from '../controllers/score/listOne.js';
import { listAllScores } from '../controllers/score/listAll.js';
import { listScoresBySubject } from '../controllers/score/listBySubject.js';
import { listScoresByEnrollment } from '../controllers/score/listByEnrollment.js';
import { getScoreBySubjectAndEnrollment } from '../controllers/score/getBySubjectAndEnrollment.js';

// Create a new Router instance dedicated to the score resource
const scoreRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new score
// Body: { originalScore, scoreType, subjectId, remedialScore, enrollmentId }
// ─────────────────────────────────────────────────────────────────────────────
scoreRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(scoreSchema.newScoreData, 'body'),
  createOneScore
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every score
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
scoreRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  listAllScores
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single score by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
scoreRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(scoreSchema.getScoreById, 'body'),
  listOneScore
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-subject  →  Retrieve scores by subject
// Body: { subjectId }
// ─────────────────────────────────────────────────────────────────────────────
scoreRouter.post(
  '/get-by-subject',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(scoreSchema.listScoresBySubject, 'body'),
  listScoresBySubject
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-enrollment  →  Retrieve scores by enrollment
// Body: { enrollmentId }
// ─────────────────────────────────────────────────────────────────────────────
scoreRouter.post(
  '/get-by-enrollment',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(scoreSchema.listScoresByEnrollment, 'body'),
  listScoresByEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-subject-and-enrollment  →  Retrieve a score for a specific
// subject and enrollment combination
// Body: { subjectId, enrollmentId }
// ─────────────────────────────────────────────────────────────────────────────
scoreRouter.post(
  '/get-by-subject-and-enrollment',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(scoreSchema.getScoreBySubjectAndEnrollment, 'body'),
  getScoreBySubjectAndEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing score
// Body: { id, originalScore?, scoreType?, subjectId?, remedialScore?, enrollmentId? }
// ─────────────────────────────────────────────────────────────────────────────
scoreRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(scoreSchema.updateScoreData, 'body'),
  updateOneScore
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a score by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
scoreRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(scoreSchema.deleteScore, 'body'),
  deleteOneScore
);

export default scoreRouter;
