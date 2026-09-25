// ────────────────────────────────────────────────────────────────────────────
// STUDENT ROUTER
// Entity: Student | Table: estudiante
//
// Defines and exposes the HTTP endpoints used to manage the "student"
// entity. This is a core domain entity; routes are protected and only
// users with appropriate roles are allowed to operate on it.
//
// Security pipeline applied to each route:
//   1. validatorHandler(schema, 'body') → validates the incoming payload
//   2. checkApiKey → verifies the client app's API key.
//   3. authAppVerifyToken → validates the session JWT and rotates it.
//   4. checkRole([...]) → authorizes only the allowed roles.
//   5. controller → executes the business operation.
//
// Mounted at: /app/v1/students  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { studentSchema } from '../schemas/studentSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneStudent } from '../controllers/student/create.js';
import { updateOneStudent } from '../controllers/student/update.js';
import { deleteOneStudent } from '../controllers/student/delete.js';
import { listOneStudent } from '../controllers/student/listOne.js';
import { listAllStudents } from '../controllers/student/listAll.js';
import { searchStudentsByName } from '../controllers/student/searchByName.js';
import { getStudentByDocumentNumber } from '../controllers/student/getByDocumentNumber.js';
import { listStudentsByMunicipality } from '../controllers/student/listByMunicipality.js';
import { listStudentsByDocumentType } from '../controllers/student/listByDocumentType.js';
import { getScoresByStudentAndYear } from '../controllers/student/getScoresByYear.js';
import { getStudentAcademicHistory } from '../controllers/student/getAcademicHistory.js';
import { getStudentCourseYears } from '../controllers/student/getCourseYears.js';
import { getScoresByStudentAndGrade } from '../controllers/student/getScoresByGrade.js';

// Create a new Router instance dedicated to the student resource
const studentRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new student
// Body: { firstName, middleName?, firstLastName, secondLastName?,
//         documentNumber?, birthDate, municipalityId,
//         documentTypeId?, genderId?, address?, email? }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  validatorHandler(studentSchema.newStudentData, 'body'),
  createOneStudent
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every student
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  listAllStudents
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single student by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(studentSchema.getStudentById, 'body'),
  listOneStudent
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-name  →  Search students by partial name (first or last)
// Body: { partialName }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.post(
  '/search-by-name',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(studentSchema.searchStudentsByName, 'body'),
  searchStudentsByName
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-document-number  →  Retrieve a student by exact document number
// Body: { documentNumber }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.post(
  '/get-by-document-number',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(studentSchema.getStudentByDocumentNumber, 'body'),
  getStudentByDocumentNumber
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-municipality  →  List students by municipality
// Body: { municipalityId }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.post(
  '/get-by-municipality',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(studentSchema.listStudentsByMunicipality, 'body'),
  listStudentsByMunicipality
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-document-type  →  List students by document type
// Body: { documentTypeId }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.post(
  '/get-by-document-type',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(studentSchema.listStudentsByDocumentType, 'body'),
  listStudentsByDocumentType
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing student
// Body: { id, firstName?, middleName?, firstLastName?, secondLastName?,
//         documentNumber?, birthDate?, municipalityId?, documentTypeId?,
//         genderId?, address?, email? }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  validatorHandler(studentSchema.updateStudentData, 'body'),
  updateOneStudent
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a student by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(studentSchema.deleteStudent, 'body'),
  deleteOneStudent
);

// ── Academic-progress read endpoints ────────────────────────────────────────
// The four routes below do not operate on the 'estudiante' table directly.
// They traverse Enrollment -> Group -> Grade -> Score to build the student's
// academic record. Note the narrower role set: 'Auxiliar' is deliberately
// excluded from academic-progress reads, unlike the CRUD reads above.

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-scores-by-year  →  Retrieve every score a student earned in a given
// academic year, grouped by grade and subject (per-year report card view)
// Body: { studentId, year }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.post(
  '/get-scores-by-year',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario']),
  validatorHandler(studentSchema.getScoresByStudentAndYear, 'body'),
  getScoresByStudentAndYear
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-academic-history  →  Retrieve a student's entire cross-year
// academic record (every enrollment, ordered by year, grade and subject)
// Body: { studentId }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.post(
  '/get-academic-history',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario']),
  validatorHandler(studentSchema.getAcademicHistory, 'body'),
  getStudentAcademicHistory
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-course-years  →  Retrieve the distinct year/grade/group triples
// a student was enrolled in (navigation index for the year selector)
// Body: { studentId }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.post(
  '/get-course-years',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario']),
  validatorHandler(studentSchema.getCourseYears, 'body'),
  getStudentCourseYears
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-scores-by-grade  →  Retrieve every score a student earned in a
// given grade, across all years the student was enrolled in that grade
// Body: { studentId, gradeName }
// ─────────────────────────────────────────────────────────────────────────────
studentRouter.post(
  '/get-scores-by-grade',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario']),
  validatorHandler(studentSchema.getScoresByStudentAndGrade, 'body'),
  getScoresByStudentAndGrade
);

export default studentRouter;
