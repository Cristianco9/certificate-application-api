// ────────────────────────────────────────────────────────────────────────────
// GROUP ROUTER
// Entity: Group | Table: grupo
//
// Defines and exposes the HTTP endpoints used to manage the "group"
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
// Mounted at: /app/v1/groups  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { groupSchema } from '../schemas/groupSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneGroup } from '../controllers/group/create.js';
import { listAllGroups } from '../controllers/group/listAll.js';
import { listOneGroup } from '../controllers/group/listOne.js';
import { searchGroupsByName } from '../controllers/group/searchByName.js';
import { listGroupsByInstitution } from '../controllers/group/listByInstitution.js';
import { listGroupsByGradeAndYear } from '../controllers/group/listByGradeAndYear.js';
import { updateOneGroup } from '../controllers/group/update.js';
import { changeGroupStatus } from '../controllers/group/changeStatus.js';
import { deleteOneGroup } from '../controllers/group/delete.js';

// Create a new Router instance dedicated to the group resource
const groupRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new group
// Body: { name, year, gradeId?, shift, institutionId?, status }
// ─────────────────────────────────────────────────────────────────────────────
groupRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(groupSchema.newGroupData, 'body'),
  createOneGroup
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every group
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
groupRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  listAllGroups
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single group by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
groupRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(groupSchema.getGroupById, 'body'),
  listOneGroup
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-name  →  Search groups by partial name
// Body: { partialName }
// ─────────────────────────────────────────────────────────────────────────────
groupRouter.post(
  '/search-by-name',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(groupSchema.searchGroupsByName, 'body'),
  searchGroupsByName
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-institution  →  Retrieve every group belonging to a given institution
// Body: { institutionId }
// ─────────────────────────────────────────────────────────────────────────────
groupRouter.post(
  '/get-by-institution',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(groupSchema.listGroupsByInstitution, 'body'),
  listGroupsByInstitution
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-grade-and-year  →  Retrieve groups matching a grade and academic year
// Body: { gradeId, year }
// ─────────────────────────────────────────────────────────────────────────────
groupRouter.post(
  '/get-by-grade-and-year',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(groupSchema.listGroupsByGradeAndYear, 'body'),
  listGroupsByGradeAndYear
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing group
// Body: { id, name?, year?, gradeId?, shift?, institutionId?, status? }
// ─────────────────────────────────────────────────────────────────────────────
groupRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(groupSchema.updateGroupData, 'body'),
  updateOneGroup
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /change-status  →  Change the status of a group (ACTIVO/INACTIVO)
// Body: { id, status }
// ─────────────────────────────────────────────────────────────────────────────
groupRouter.patch(
  '/change-status',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(groupSchema.changeGroupStatus, 'body'),
  changeGroupStatus
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a group by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
groupRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(groupSchema.deleteGroup, 'body'),
  deleteOneGroup
);

export default groupRouter;
