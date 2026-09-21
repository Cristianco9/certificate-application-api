// ────────────────────────────────────────────────────────────────────────────
// ENROLLMENT ROUTER
// Entity: Enrollment | Table: matricula
//
// Defines and exposes the HTTP endpoints used to manage the "enrollment"
// entity, which links a Student to a Group on a given date. Unlike the
// simple catalogs (Country, Department, Grade, etc.), Enrollment is a
// core operational entity — mirroring the role split already used in
// studentRouter.js: mutation routes are restricted to a narrower set of
// roles, while read routes are open to the broader set of roles that
// need to consult academic history and group rosters day to day
// (Rector, Funcionario/Secretario Académico, Auxiliar).
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
// Mounted at: /app/v1/enrollments  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { enrollmentSchema } from '../schemas/enrollmentSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneEnrollment } from '../controllers/enrollment/create.js';
import { listAllEnrollments } from '../controllers/enrollment/listAll.js';
import { listOneEnrollment } from '../controllers/enrollment/listOne.js';
import { listEnrollmentsByStudent } from '../controllers/enrollment/listByStudent.js';
import { listEnrollmentsByGroup } from '../controllers/enrollment/listByGroup.js';
import { getEnrollmentByStudentAndGroup } from '../controllers/enrollment/getByStudentAndGroup.js';
import { updateOneEnrollment } from '../controllers/enrollment/update.js';
import { deleteOneEnrollment } from '../controllers/enrollment/delete.js';

// Create a new Router instance dedicated to the enrollment resource
const enrollmentRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new enrollment (link a student to a group)
// Body: { studentId, groupId, enrollmentDate }
// ─────────────────────────────────────────────────────────────────────────────
enrollmentRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  validatorHandler(enrollmentSchema.newEnrollmentData, 'body'),
  createOneEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every enrollment
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
enrollmentRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  listAllEnrollments
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single enrollment by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
enrollmentRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(enrollmentSchema.getEnrollmentById, 'body'),
  listOneEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-student  →  Retrieve every enrollment belonging to a student
// (supports building a student's full academic history)
// Body: { studentId }
// ─────────────────────────────────────────────────────────────────────────────
enrollmentRouter.post(
  '/get-by-student',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(enrollmentSchema.listEnrollmentsByStudent, 'body'),
  listEnrollmentsByStudent
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-group  →  Retrieve every enrollment belonging to a group
// (supports listing the roster of a group)
// Body: { groupId }
// ─────────────────────────────────────────────────────────────────────────────
enrollmentRouter.post(
  '/get-by-group',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(enrollmentSchema.listEnrollmentsByGroup, 'body'),
  listEnrollmentsByGroup
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-student-and-group  →  Retrieve the enrollment (if any)
// linking a specific student to a specific group
// Body: { studentId, groupId }
// ─────────────────────────────────────────────────────────────────────────────
enrollmentRouter.post(
  '/get-by-student-and-group',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(enrollmentSchema.getEnrollmentByStudentAndGroup, 'body'),
  getEnrollmentByStudentAndGroup
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing enrollment
// Body: { id, studentId?, groupId?, enrollmentDate? }
// ─────────────────────────────────────────────────────────────────────────────
enrollmentRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  validatorHandler(enrollmentSchema.updateEnrollmentData, 'body'),
  updateOneEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete an enrollment by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
enrollmentRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(enrollmentSchema.deleteEnrollment, 'body'),
  deleteOneEnrollment
);

export default enrollmentRouter;
