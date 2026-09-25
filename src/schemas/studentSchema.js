// ─────────────────────────────────────────────────────────────────────────────
// STUDENT SCHEMA — Joi Validation
// Entity: Student | Table: estudiante
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps 1:1 to the public methods of StudentServices. The frontend sends
// every value through the request body — never via URL params or query
// string — so every schema below is meant to be applied as
// validatorHandler(schema, 'body'), including the ones that only carry an
// id. Methods that take a single primitive argument on the service side
// are still validated as a small object with one named key, since Joi
// always validates an object shape.
// ─────────────────────────────────────────────────────────────────────────────

import Joi from 'joi';

import {
  studentId,
  studentFirstName,
  studentMiddleName,
  studentFirstLastName,
  studentSecondLastName,
  studentDocumentNumber,
  studentBirthDate,
  studentAddress,
  studentEmail,
  studentMunicipalityId,
  studentDocumentTypeId,
  studentGenderId,
} from '../utils/RegEx/studentRegEx.js';
import { groupYear } from '../utils/RegEx/groupRegEx.js';
import { gradeName } from '../utils/RegEx/gradeRegEx.js';

// ── Primitive Joi types ─────────────────────────────────────────────────────

// Backs Student.id ('id_estudiante'). Kept as a string pattern, not
// Joi.number(), since studentId is a digit-string RegEx.
const joiId = Joi.string().pattern(studentId).messages({
  'string.base': 'El id debe ser una cadena de texto.',
  'string.pattern.base': 'El id debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs Student.firstName ('primer_nombre_estudiante')
const joiFirstName = Joi.string().pattern(studentFirstName).messages({
  'string.base': 'El primer nombre debe ser una cadena de texto.',
  'string.pattern.base': 'El primer nombre debe tener entre 3 y 50 caracteres y contener solo letras.',
});

// Backs Student.middleName ('segundo_nombre_estudiante'). Optional field;
// allows empty string because the database column accepts NULL.
const joiMiddleName = Joi.string().pattern(studentMiddleName).allow('').messages({
  'string.base': 'El segundo nombre debe ser una cadena de texto.',
  'string.pattern.base': 'El segundo nombre debe tener entre 3 y 50 caracteres y contener solo letras.',
});

// Backs Student.firstLastName ('primer_apellido_estudiante')
const joiFirstLastName = Joi.string().pattern(studentFirstLastName).messages({
  'string.base': 'El primer apellido debe ser una cadena de texto.',
  'string.pattern.base': 'El primer apellido debe tener entre 3 y 50 caracteres y contener solo letras.',
});

// Backs Student.secondLastName ('segundo_apellido_estudiante'). Optional field;
// allows empty string because the database column accepts NULL.
const joiSecondLastName = Joi.string().pattern(studentSecondLastName).allow('').messages({
  'string.base': 'El segundo apellido debe ser una cadena de texto.',
  'string.pattern.base': 'El segundo apellido debe tener entre 3 y 50 caracteres y contener solo letras.',
});

// Backs Student.documentNumber ('identificacion_estudiante'). Optional and
// nullable. Allows empty string to represent NULL in the database.
const joiDocumentNumber = Joi.string().pattern(studentDocumentNumber).allow('').messages({
  'string.base': 'El número de documento debe ser una cadena de texto.',
  'string.pattern.base': 'El número de documento debe tener entre 6 y 10 dígitos (cédula) o entre 6 y 20 caracteres alfanuméricos (pasaporte).',
});

// Backs Student.birthDate ('fecha_nacimiento_estudiante'). Validated as a
// string matching ISO date format with year range 1900-2099.
const joiBirthDate = Joi.string().pattern(studentBirthDate).messages({
  'string.base': 'La fecha de nacimiento debe ser una cadena de texto.',
  'string.pattern.base': 'La fecha de nacimiento debe tener el formato YYYY-MM-DD y ser una fecha válida entre 1900 y 2099.',
});

// Backs Student.address ('direccion_estudiante'). Optional field.
const joiAddress = Joi.string().pattern(studentAddress).allow('').messages({
  'string.base': 'La dirección debe ser una cadena de texto.',
  'string.pattern.base': 'La dirección debe tener entre 5 y 120 caracteres y contener solo letras, números, espacios y los símbolos # - ,',
});

// Backs Student.email ('email_estudiante'). Optional field.
const joiEmail = Joi.string().pattern(studentEmail).allow('').messages({
  'string.base': 'El correo electrónico debe ser una cadena de texto.',
  'string.pattern.base': 'El correo electrónico debe tener un formato válido (ejemplo@dominio.com).',
});

// Backs Student.municipalityId ('id_municipio_estudiante'). Required.
const joiMunicipalityId = Joi.string().pattern(studentMunicipalityId).messages({
  'string.base': 'El id del municipio debe ser una cadena de texto.',
  'string.pattern.base': 'El id del municipio debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs Student.documentTypeId ('id_tipo_documento_estudiante'). Optional.
// Allows empty string to represent NULL.
const joiDocumentTypeId = Joi.string().pattern(studentDocumentTypeId).allow('').messages({
  'string.base': 'El id del tipo de documento debe ser una cadena de texto.',
  'string.pattern.base': 'El id del tipo de documento debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs Student.genderId ('id_genero_estudiante'). Optional.
// Allows empty string to represent NULL.
const joiGenderId = Joi.string().pattern(studentGenderId).allow('').messages({
  'string.base': 'El id del género debe ser una cadena de texto.',
  'string.pattern.base': 'El id del género debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs Group.year ('anio_grupo'). Reused from groupRegEx.js because
// getScoresByStudentAndYear filters scores by the group's academic year.
const joiYear = Joi.string().pattern(groupYear).messages({
  'string.base': 'El año debe ser una cadena de texto.',
  'string.pattern.base': 'El año debe ser un número de 4 dígitos entre 1900 y 2099.',
});

// Backs Grade.name ('nombre_grado'). Reused from gradeRegEx.js because
// getScoresByStudentAndGrade filters scores by the grade's exact ENUM name.
const joiGradeName = Joi.string().pattern(gradeName).messages({
  'string.base': 'El nombre del grado debe ser una cadena de texto.',
  'string.pattern.base': 'El nombre del grado debe ser uno de: Primero, Segundo, Tercero, Cuarto, Quinto, Sexto, Séptimo, Octavo, Noveno, Décimo, Undécimo.',
});

// ── Schema export ────────────────────────────────────────────────────────────

export const studentSchema = {

  // POST /students/get-by-id (body: { id })
  // Validates StudentServices.listOne(studentId)
  getStudentById: Joi.object({
    id: joiId.required(),
  }),

  // GET /students/list-all
  // Validates StudentServices.listAll() — no input parameters, so no schema
  // is applied to this endpoint.

  // POST /students/search-by-name (body: { partialName })
  // Validates StudentServices.listByPartialName(partialName)
  searchStudentsByName: Joi.object({
    partialName: joiFirstName.required(),
  }),

  // POST /students/get-by-document-number (body: { documentNumber })
  // Validates StudentServices.listByDocumentNumber(documentNumber)
  getStudentByDocumentNumber: Joi.object({
    documentNumber: joiDocumentNumber.required(),
  }),

  // POST /students/get-by-municipality (body: { municipalityId })
  // Validates StudentServices.listByMunicipality(municipalityId)
  listStudentsByMunicipality: Joi.object({
    municipalityId: joiMunicipalityId.required(),
  }),

  // POST /students/get-by-document-type (body: { documentTypeId })
  // Validates StudentServices.listByDocumentType(documentTypeId)
  listStudentsByDocumentType: Joi.object({
    documentTypeId: joiDocumentTypeId.required(),
  }),

  // POST /students (body: { firstName, middleName?, firstLastName, secondLastName?,
  //                          documentNumber?, birthDate, municipalityId,
  //                          documentTypeId?, genderId?, address?, email? })
  // Validates StudentServices.createOne(newStudent).
  // 'firstName', 'firstLastName', 'birthDate' and 'municipalityId' are required,
  // matching allowNull: false on those columns.
  // 'middleName', 'secondLastName', 'documentNumber', 'documentTypeId',
  // 'genderId', 'address' and 'email' are optional, matching allowNull: true
  // on the database columns.
  newStudentData: Joi.object({
    firstName: joiFirstName.required(),
    middleName: joiMiddleName,
    firstLastName: joiFirstLastName.required(),
    secondLastName: joiSecondLastName,
    documentNumber: joiDocumentNumber,
    birthDate: joiBirthDate.required(),
    municipalityId: joiMunicipalityId.required(),
    documentTypeId: joiDocumentTypeId,
    genderId: joiGenderId,
    address: joiAddress,
    email: joiEmail,
  }),

  // PATCH /students (body: { id, firstName?, middleName?, firstLastName?,
  //                          secondLastName?, documentNumber?, birthDate?,
  //                          municipalityId?, documentTypeId?, genderId?,
  //                          address?, email? })
  // Validates BOTH arguments of StudentServices.updateOne(studentId,
  // newStudentData) in a single object, since the frontend sends the id
  // inside the body rather than as a route param.
  // 'id' is always required; at least one mutable field must also be
  // present so the request carries something to update.
  updateStudentData: Joi.object({
    id: joiId.required(),
    firstName: joiFirstName,
    middleName: joiMiddleName,
    firstLastName: joiFirstLastName,
    secondLastName: joiSecondLastName,
    documentNumber: joiDocumentNumber,
    birthDate: joiBirthDate,
    municipalityId: joiMunicipalityId,
    documentTypeId: joiDocumentTypeId,
    genderId: joiGenderId,
    address: joiAddress,
    email: joiEmail,
  }).or(
    'firstName', 'middleName', 'firstLastName', 'secondLastName',
    'documentNumber', 'birthDate', 'municipalityId', 'documentTypeId',
    'genderId', 'address', 'email'
  ).messages({
    'object.missing': 'Debe proporcionar al menos un campo para actualizar el estudiante.',
  }),

  // DELETE /students (body: { id })
  // Validates StudentServices.deleteOne(studentId)
  deleteStudent: Joi.object({
    id: joiId.required(),
  }),

  // POST /students/get-scores-by-year (body: { studentId, year })
  // Validates StudentServices.listScoresByStudentAndYear(studentId, year).
  // Returns every score the student earned in the given academic year.
  getScoresByStudentAndYear: Joi.object({
    studentId: joiId.required(),
    year: joiYear.required(),
  }),

  // POST /students/get-academic-history (body: { studentId })
  // Validates StudentServices.getAcademicHistory(studentId).
  // Returns the student's entire cross-year academic record.
  getAcademicHistory: Joi.object({
    studentId: joiId.required(),
  }),

  // POST /students/get-course-years (body: { studentId })
  // Validates StudentServices.listCourseYears(studentId).
  // Returns the distinct year/grade/group triples the student was enrolled in.
  getCourseYears: Joi.object({
    studentId: joiId.required(),
  }),

  // POST /students/get-scores-by-grade (body: { studentId, gradeName })
  // Validates StudentServices.listScoresByStudentAndGrade(studentId, gradeName).
  // Returns every score the student earned in the given grade, across all years.
  getScoresByStudentAndGrade: Joi.object({
    studentId: joiId.required(),
    gradeName: joiGradeName.required(),
  }),
};
