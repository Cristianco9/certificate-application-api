// ────────────────────────────────────────────────────────────────────────────
// STUDENT PHONE ROUTER
// Entity: StudentPhone | Table: estudiante_telefono
//
// Defines and exposes the HTTP endpoints used to manage the
// "student-phone" bridge table. This bridge links a Student to one of
// their Phone records. Unlike PhoneServices (which exposes the phone
// catalog itself and the generic owner-linking methods), this router is
// scoped exclusively to the Student side of the ownership relationship.
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
// Role policy: mirrors the student entity's own role split — mutations
// are restricted to the roles that can manage students (Máster,
// Administrador, Auxiliar), while reads are open to every authenticated
// role that needs to consult student contact information.
//
// Mounted at: /app/v1/student-phones  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { studentPhoneSchema } from '../schemas/studentPhoneSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneStudentPhone } from '../controllers/studentPhone/create.js';
import { deleteOneStudentPhone } from '../controllers/studentPhone/delete.js';
import { unlinkStudentPhone } from '../controllers/studentPhone/unlinkByStudentAndPhone.js';
import { listOneStudentPhone } from '../controllers/studentPhone/listOne.js';
import { listAllStudentPhones } from '../controllers/studentPhone/listAll.js';
import { listStudentPhonesByStudent } from '../controllers/studentPhone/listByStudent.js';
import { listStudentPhonesByPhone } from '../controllers/studentPhone/listByPhone.js';
import { getStudentPhoneByStudentAndPhone } from '../controllers/studentPhone/getByStudentAndPhone.js';

// Create a new Router instance dedicated to the student-phone resource
const studentPhoneRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Link a phone to a student
// Body: { studentId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
studentPhoneRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  validatorHandler(studentPhoneSchema.newStudentPhoneData, 'body'),
  createOneStudentPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every student-phone link
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
studentPhoneRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  listAllStudentPhones
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single student-phone link by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
studentPhoneRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(studentPhoneSchema.getStudentPhoneById, 'body'),
  listOneStudentPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-student  →  List every phone linked to a given student
// Body: { studentId }
// ─────────────────────────────────────────────────────────────────────────────
studentPhoneRouter.post(
  '/get-by-student',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario', 'Auxiliar']),
  validatorHandler(studentPhoneSchema.listStudentPhonesByStudent, 'body'),
  listStudentPhonesByStudent
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-phone  →  List every student linked to a given phone
// Body: { phoneId }
// ─────────────────────────────────────────────────────────────────────────────
studentPhoneRouter.post(
  '/get-by-phone',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  validatorHandler(studentPhoneSchema.listStudentPhonesByPhone, 'body'),
  listStudentPhonesByPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-student-and-phone  →  Retrieve the link (if any) between a
// specific student and a specific phone
// Body: { studentId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
studentPhoneRouter.post(
  '/get-by-student-and-phone',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(studentPhoneSchema.getStudentPhoneByStudentAndPhone, 'body'),
  getStudentPhoneByStudentAndPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a student-phone link by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
studentPhoneRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  validatorHandler(studentPhoneSchema.deleteStudentPhone, 'body'),
  deleteOneStudentPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /unlink  →  Delete a student-phone link by composite key
// (studentId + phoneId). Convenience endpoint for callers that already
// hold both FK values.
// Body: { studentId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
studentPhoneRouter.delete(
  '/unlink',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  validatorHandler(studentPhoneSchema.unlinkStudentPhone, 'body'),
  unlinkStudentPhone
);

export default studentPhoneRouter;
