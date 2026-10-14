// ─────────────────────────────────────────────────────────────────────────────
// ROLE SCHEMA — Joi Validation
// Entity: Role | Table: rol
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps 1:1 to the public methods of RoleServices. The frontend sends every
// value through the request body — never via URL params or query string —
// so every schema below is meant to be applied as
// validatorHandler(schema, 'body'), including the ones that only carry an
// id. Methods that take a single primitive argument on the service side
// (listOne, deleteOne, listByName, listByPartialDescription) are still
// validated as a small object with one named key, since Joi always
// validates an object shape.
// This entity mixes both search styles seen so far: 'name' is a closed
// ENUM (exact lookup only, no search endpoint — like AcademicLevel/Gender/
// DocumentType), while 'description' is free text (partial-text search
// endpoint — like Country/Department/Municipality).

import Joi from 'joi';

import { roleId, roleName, roleDescription } from '../utils/RegEx/roleRegEx.js';

// ── Primitive Joi types ─────────────────────────────────────────────────────

// Backs Role.id ('id_rol'). Kept as a string pattern, not Joi.number(),
// since roleId is a digit-string RegEx.
const joiId = Joi.string().pattern(roleId).messages({
  'string.base': 'El id debe ser una cadena de texto.',
  'string.pattern.base': 'El id debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs Role.name ('nombre_rol'), a closed set of 5 institutional roles
const joiName = Joi.string().pattern(roleName).messages({
  'string.base': 'El nombre del rol debe ser una cadena de texto.',
  'string.pattern.base': 'El nombre del rol debe ser uno de: Máster, Auxiliar, Administrador, Secretario, Rector.',
});

// Backs Role.description ('descripcion_rol'), free text
const joiDescription = Joi.string().pattern(roleDescription).messages({
  'string.base': 'La descripción del rol debe ser una cadena de texto.',
  'string.pattern.base': 'La descripción del rol debe tener entre 3 y 70 caracteres y contener solo letras, números, espacios y los signos . , -',
});

// ── Schema export ────────────────────────────────────────────────────────────

export const roleSchema = {

  // POST /roles/get-by-id (body: { id })
  // Validates RoleServices.listOne(roleId)
  getRoleById: Joi.object({
    id: joiId.required(),
  }),

  // GET /roles/list ()
  // Validates RoleServices.listAll() — no input parameters, so no
  // schema is applied to this endpoint.

  // POST /roles/get-by-name (body: { name })
  // Validates RoleServices.listByName(name). Exact lookup, since
  // 'name' is a closed ENUM — no partial-text search for this field.
  getRoleByName: Joi.object({
    name: joiName.required(),
  }),

  // POST /roles/search-by-description (body: { partialDescription })
  // Validates RoleServices.listByPartialDescription(partialDescription).
  // Unlike 'name', 'description' is free text, so a partial search is
  // meaningful here. Reuses the 'description' character-set rule.
  searchRolesByDescription: Joi.object({
    partialDescription: joiDescription.required(),
  }),

  // POST /roles (body: { name, description })
  // Validates RoleServices.createOne(newRole). Both fields are
  // required, matching allowNull: false on both columns.
  newRoleData: Joi.object({
    name: joiName.required(),
    description: joiDescription.required(),
  }),

  // PATCH /roles (body: { id, name?, description? })
  // Validates BOTH arguments of RoleServices.updateOne(roleId,
  // newRoleData) in a single object, since the frontend sends the id
  // inside the body rather than as a route param. 'id' is always
  // required; at least one of 'name'/'description' must also be
  // present so the request carries something to update.
  updateRoleData: Joi.object({
    id: joiId.required(),
    name: joiName,
    description: joiDescription,
  }).or('name', 'description').messages({
    'object.missing': 'Debe proporcionar al menos uno de los campos name o description para actualizar el rol.',
  }),

  // DELETE /roles (body: { id })
  // Validates RoleServices.deleteOne(roleId)
  deleteRole: Joi.object({
    id: joiId.required(),
  }),

};
