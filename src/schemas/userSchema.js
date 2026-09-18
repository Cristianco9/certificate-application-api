// ─────────────────────────────────────────────────────────────────────────────
// USER SCHEMA — Joi Validation
// Entity: User | Table: usuario
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps 1:1 to the public methods of UserServices. The frontend sends
// every value through the request body — never via URL params or query
// string — so every schema below is meant to be applied as
// validatorHandler(schema, 'body'), including the ones that only carry an
// id. Methods that take a single primitive argument on the service side
// (listOne, deleteOne) are still validated as a small object with one
// named key, since Joi always validates an object shape.
//
// 'status' is backed by a fixed MySQL ENUM, so it is validated with
// Joi.valid() rather than a RegEx pattern. 'lastLogin' is a date and is
// validated with Joi.date().
// ─────────────────────────────────────────────────────────────────────────────

import Joi from 'joi';

import {
  userId,
  username,
  userFirstName,
  userLastName,
  userDocumentNumber,
  userEmail,
  userPassword,
  userDocumentTypeId,
  userMunicipalityId,
  userRoleId,
  userAcademicLevelId,
  userGenderId,
} from '../utils/RegEx/userRegEx.js';

// ── Primitive Joi types ─────────────────────────────────────────────────────

// Backs User.id ('id_usuario'). Kept as a string pattern, not Joi.number(),
// since userId is a digit-string RegEx.
const joiId = Joi.string().pattern(userId).messages({
  'string.base': 'El id debe ser una cadena de texto.',
  'string.pattern.base': 'El id debe contener solo dígitos (1 a 10 dígitos).',
});

// backs User.username() ('alias_usuario').
const joiUsername = Joi.string().pattern(username).messages({
  'string.base': 'El nombre de usuario debe ser una cadena de texto.',
  'string.pattern.base': 'El nombre de usuario debe tener entre 3 y 30 caracteres (letras, números, puntos, guiones).',
});

// Backs User.firstName ('nombres_usuario').
const joiFirstName = Joi.string().pattern(userFirstName).messages({
  'string.base': 'El nombre debe ser una cadena de texto.',
  'string.pattern.base': 'El nombre debe tener entre 3 y 50 caracteres y contener solo letras y espacios.',
});

// Backs User.lastName ('apellidos_usuario').
const joiLastName = Joi.string().pattern(userLastName).messages({
  'string.base': 'El apellido debe ser una cadena de texto.',
  'string.pattern.base': 'El apellido debe tener entre 3 y 50 caracteres y contener solo letras y espacios.',
});

// Backs User.documentNumber ('identificacion_usuario'). Unique and required.
const joiDocumentNumber = Joi.string().pattern(userDocumentNumber).messages({
  'string.base': 'El número de documento debe ser una cadena de texto.',
  'string.pattern.base': 'El número de documento debe tener entre 6 y 10 dígitos (cédula) o entre 6 y 20 caracteres alfanuméricos (pasaporte).',
});

// Backs User.email ('email_usuario'). Unique and required.
const joiEmail = Joi.string().pattern(userEmail).messages({
  'string.base': 'El correo electrónico debe ser una cadena de texto.',
  'string.pattern.base': 'El correo electrónico debe tener un formato válido (ejemplo@dominio.com).',
});

// Backs User.password ('password_usuario'). Validates the plain-text password
// before hashing. Required for creation, optional for update.
const joiPassword = Joi.string().pattern(userPassword).messages({
  'string.base': 'La contraseña debe ser una cadena de texto.',
  'string.pattern.base': 'La contraseña debe tener entre 8 y 80 caracteres y contener al menos una letra y un número.',
});

// Backs User.status ('estado_usuario'). ENUM('ACTIVO','INACTIVO').
const joiStatus = Joi.string().valid('ACTIVO', 'INACTIVO').messages({
  'string.base': 'El estado debe ser una cadena de texto.',
  'any.only': 'El estado debe ser "ACTIVO" o "INACTIVO".',
});

// Backs User.lastLogin ('ultimo_login_usuario'). Validated as a native date.
const joiLastLogin = Joi.date().messages({
  'date.base': 'La fecha del último login debe ser una fecha válida.',
});

// Foreign keys (all required in the database)
const joiDocumentTypeId = Joi.string().pattern(userDocumentTypeId).messages({
  'string.base': 'El id del tipo de documento debe ser una cadena de texto.',
  'string.pattern.base': 'El id del tipo de documento debe contener solo dígitos (1 a 10 dígitos).',
});

const joiMunicipalityId = Joi.string().pattern(userMunicipalityId).messages({
  'string.base': 'El id del municipio debe ser una cadena de texto.',
  'string.pattern.base': 'El id del municipio debe contener solo dígitos (1 a 10 dígitos).',
});

const joiRoleId = Joi.string().pattern(userRoleId).messages({
  'string.base': 'El id del rol debe ser una cadena de texto.',
  'string.pattern.base': 'El id del rol debe contener solo dígitos (1 a 10 dígitos).',
});

const joiAcademicLevelId = Joi.string().pattern(userAcademicLevelId).messages({
  'string.base': 'El id del nivel académico debe ser una cadena de texto.',
  'string.pattern.base': 'El id del nivel académico debe contener solo dígitos (1 a 10 dígitos).',
});

const joiGenderId = Joi.string().pattern(userGenderId).messages({
  'string.base': 'El id del género debe ser una cadena de texto.',
  'string.pattern.base': 'El id del género debe contener solo dígitos (1 a 10 dígitos).',
});

// ── Schema export ────────────────────────────────────────────────────────────

export const userSchema = {

  // POST /users/get-by-id (body: { id })
  // Validates UserServices.listOne(userId)
  getUserById: Joi.object({
    id: joiId.required(),
  }),

  // GET /users/list-all → no input parameters, no schema applied.

  // POST /users (body: { username, firstName, lastName, documentTypeId, documentNumber,
  // municipalityId, roleId, academicLevelId, email, status, password, genderId, lastLogin? })
  // Validates UserServices.createOne(newUser). All fields except lastLogin are required.
  // lastLogin is optional because it can be set to a default (e.g., current date) in the service.
  newUserData: Joi.object({
    username: joiUsername.required(),
    firstName: joiFirstName.required(),
    lastName: joiLastName.required(),
    documentTypeId: joiDocumentTypeId.required(),
    documentNumber: joiDocumentNumber.required(),
    municipalityId: joiMunicipalityId.required(),
    roleId: joiRoleId.required(),
    academicLevelId: joiAcademicLevelId.required(),
    email: joiEmail.required(),
    status: joiStatus.required(),
    password: joiPassword.required(),
    genderId: joiGenderId.required(),
    lastLogin: joiLastLogin,
  }),

  // PATCH /users (body: { id, username?, firstName?, lastName?, documentTypeId?, documentNumber?,
  // municipalityId?, roleId?, academicLevelId?, email?, status?, genderId?, lastLogin? })
  // Validates UserServices.updateOne(userId, newUserData).
  // 'password' is intentionally NOT included here: UserServices.updateOne rejects it
  // outright, since password changes must go through changePasswordData or
  // resetPasswordData instead. 'id' is always required; at least one other field
  // must be present.
  updateUserData: Joi.object({
    id: joiId.required(),
    username: joiUsername,
    firstName: joiFirstName,
    lastName: joiLastName,
    documentTypeId: joiDocumentTypeId,
    documentNumber: joiDocumentNumber,
    municipalityId: joiMunicipalityId,
    roleId: joiRoleId,
    academicLevelId: joiAcademicLevelId,
    email: joiEmail,
    status: joiStatus,
    genderId: joiGenderId,
    lastLogin: joiLastLogin,
  }).or(
    'username', 'firstName', 'lastName', 'documentTypeId', 'documentNumber',
    'municipalityId', 'roleId', 'academicLevelId', 'email','status',
    'genderId', 'lastLogin'
  ).messages({
    'object.missing': 'Debe proporcionar al menos un campo para actualizar el usuario.',
  }),

  // DELETE /users (body: { id })
  // Validates UserServices.deleteOne(userId)
  deleteUser: Joi.object({
    id: joiId.required(),
  }),

  // POST /auth/login (body: { credentials: { username, password } })
  // Validates the login credentials against UserServices.login(username, password).
  loginCredentials: Joi.object({
    credentials: Joi.object({
      username: joiUsername.required(),
      password: joiPassword.required(),
    }).required(),
  }),

  // POST /auth/reset-password (body: { email, documentNumber, newPassword })
  // Validates UserServices.resetPassword(email, documentNumber, newPassword).
  // Used by a user who cannot log in and does not remember their current
  // password. No session/token is involved: identity is verified by matching
  // email + documentNumber to the SAME user record before the password is
  // replaced. All three fields are required.
  resetPasswordData: Joi.object({
    email: joiEmail.required(),
    documentNumber: joiDocumentNumber.required(),
    newPassword: joiPassword.required(),
  }),
};
