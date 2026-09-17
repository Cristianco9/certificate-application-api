# AGENTS.md — Historical Academic Certificate Management API

> **Audience:** AI coding agents (and human developers) continuing work on this backend.
> **Scope:** `certificate-application` — the Node.js/Express REST API that powers the
> Historical Academic Certificate Management System described in the frontend's
> `guidelines.md`. This document is the backend counterpart to that file.

---

## 1. What this project is

A REST API for digitizing academic certificate management for a Colombian
educational institution: student records, academic history, enrollments,
scores, certificates, institutional catalogs (countries/departments/
municipalities, document types, genders, roles, academic levels), and user
administration.

The frontend (a separate Next.js/React application) consumes this API over
HTTP/JSON and **must never** access the database directly or duplicate
business rules implemented here. This API is the single source of truth for
data integrity, authorization, and certificate business logic.

---

## 2. Technology stack

| Concern | Technology |
|---|---|
| Runtime | Node.js (ESM — `"type": "module"` in `package.json`) |
| Framework | Express 5 |
| ORM | Sequelize 6 (MySQL dialect) |
| Database | MySQL 8 (via Docker Compose) |
| Validation | Joi |
| Auth | JWT (`jsonwebtoken`) in an httpOnly cookie, rotated per request |
| Password hashing | `bcryptjs` |
| Error handling | `@hapi/boom` |
| Logging | `morgan` |
| Migrations/seeders | `sequelize-cli` (`.cjs` files) |

Do not introduce a different ORM, validation library, or auth mechanism
without an explicit, justified reason (see AI agent rules below).

---

## 3. Request pipeline (strict order — do not reorder)

Every protected route follows this exact middleware sequence:

```
1. validatorHandler(schema, 'body')   → Joi validation of the payload
2. checkApiKey                        → verifies the 'apikey' header
3. authAppVerifyToken                 → verifies + rotates the session JWT
4. checkRole([...])                   → authorizes by decoded role (when applicable)
5. controller                         → business orchestration + response shaping
```

Public routes (`POST /users/login`, `POST /users/reset-password`) skip steps
3–4 since no session exists yet — `resetPassword` verifies identity via
`email` + `documentNumber` matching the same user record instead of a token.

**Do not** move `checkRole` before `authAppVerifyToken` — it reads
`req.user`, which is only populated by the token middleware.

---

## 4. Layered architecture (never skip a layer)

```
Router → Middleware chain → Controller → Service → Sequelize Model → MySQL
```

- **Router** (`src/routes/*.js`): wires HTTP method + path + middleware
  chain + controller. One router file per entity, mounted under
  `/app/v1/<resource>` in `src/routes/index.js`.
- **Controller** (`src/controllers/<entity>/*.js`): extracts/shapes
  `req.body`, calls exactly one service method, formats the JSON response
  (`success`, `message`, entity payload, `authentication` echo), and passes
  errors to `next(Boom.boomify(error, { message }))`. Controllers never
  touch Sequelize directly and never contain business rules.
- **Service** (`src/services/<entity>Services.js`): all business logic,
  validation-that-Joi-can't-express (cross-field consistency, closed-set
  ENUM checks, uniqueness scoped to a parent, referential-integrity guards
  before delete), and the only layer that talks to Sequelize models.
- **Model** (`src/db/models/<entity>.js`): Sequelize `define()` calls only.
  Associations live centrally in `src/db/models/index.js`
  (`setupAssociations()`), not scattered across model files.

---

## 5. Service layer conventions

Follow the existing services (`countryServices.js`, `studentServices.js`,
`groupServices.js`, etc.) as the reference implementation:

- **Every public method returns an explicit status object**
  (`{ status: 'CREATED SUCCESSFULLY' }`, `{ status: 'DELETED SUCCESSFULLY' }`)
  or the requested record(s) — never a bare boolean. The controller decides
  the HTTP status/response shape from that status string.
- **Private helpers** use a leading underscore (`_findById`, `_assertExists`,
  `_assertNoAssociatedX`) — true `#private` fields are avoided to stay
  compatible with the `ecmaVersion: 12` ESLint target. Do not call
  underscore-prefixed methods from controllers.
- **Static utilities** (`static VALID_NAMES = [...]`, `static formatName()`,
  `static _formatX()`) hold closed ENUM sets, Sequelize `include` configs
  shared across read methods, and reshaping helpers that replace raw FK
  integers with nested `{ id, name }` objects before the response leaves
  the service.
- **Before every mutation, validate existence/precondition first**
  (`_assertExists`, `_findByX` uniqueness checks) so the person gets a clear
  `Boom.conflict` / `Boom.notFound` instead of a raw ORM constraint error.
- **Before every delete, guard against dependent records** even when the DB
  constraint is `SET NULL` rather than `RESTRICT` — several entities
  (Grade, Municipality's institutions, DocumentType's students, Gender's
  students, CertificateRecipient's certificates) enforce a *stricter*
  business rule than the schema technically requires, to avoid silently
  orphaning historical data. Check the migration's `onDelete` behavior
  before assuming a guard is or isn't needed.
- **Every catch block re-throws via `Boom.boomify(error, { message })`** —
  this passes already-boomified errors (conflict, notFound, badRequest)
  through untouched and only defaults genuinely unexpected errors to 500.
  Never swallow or `console.log` an error instead of re-throwing.
- **ENUM-backed columns get service-level validation** against a
  `static VALID_X` array before the query reaches MySQL, because a raw
  ENUM rejection produces a cryptic ORM error. See `AcademicLevelServices`,
  `DocumentTypeServices`, `GenderServices`, `GradeServices`, `RoleServices`,
  `GroupServices` (shift/status), `ScoreServices` (score type +
  cross-field value/type consistency).
- **Business-level uniqueness not enforced by a DB constraint** (e.g.
  Department name scoped to Country, Municipality name scoped to
  Department) is enforced explicitly in the service, documented in the
  class JSDoc, mirroring the intended composite key.

---

## 6. Controller conventions

- One file per operation: `create.js`, `update.js`, `delete.js`,
  `listOne.js`, `listAll.js`, `searchByX.js`, `getByX.js`, etc. — never a
  single `controller.js` per entity handling every route.
- Extract only the fields relevant to that operation from `req.body`
  (already validated upstream) into a plain object before calling the
  service — don't pass `req.body` straight through.
- Success responses always include:
  ```json
  { "success": true, "message": "<Spanish, user-facing>", "<entityKey>": ..., "authentication": "<rotated JWT>" }
  ```
  `authentication` echoes `res.locals.newUserToken`, set upstream by
  `authAppVerifyToken` — controllers never sign a token themselves.
- **User-facing `message` strings are in Spanish**; code, comments, and
  identifiers are in English. Keep this split consistent.
- Errors always flow through `next(Boom.boomify(error, { message }))` —
  never `res.status(500).json(...)` directly inside a controller (that's
  the job of the centralized error-handling middleware).

---

## 7. Schema (Joi) conventions

- One schema file per entity (`src/schemas/<entity>Schema.js`), mapping
  1:1 to the service's public methods.
- **Every schema validates `req.body`** — this API never uses route
  params or query strings, even for single-id lookups. A `listOne` schema
  still validates `{ id }` from the body.
- Primitive RegEx patterns live separately in
  `src/utils/RegEx/<entity>RegEx.js` and are imported into the schema —
  don't inline patterns in the schema file.
- IDs are validated as **digit strings** (`/^\d{1,10}$/`), not
  `Joi.number()`, matching the RegEx-based approach used throughout.
- Update schemas require the mutation id plus `.or(...)` across the
  optional mutable fields, so a request with no actual changes is
  rejected at the validation layer (`'object.missing'` custom message).
- ENUM-backed fields use `Joi.valid(...)` (shift, status, score type) —
  ENUM-backed *free-text-looking* fields (grade name, role name, document
  type name) use an exact-literal-alternation RegEx instead, since the
  value set is fixed but represented as a MySQL ENUM, not a lookup table.
- Dates (`birthDate`, `enrollmentDate`, `lastLogin`) are validated with
  `Joi.date()`, never a RegEx — a text pattern can check format/range but
  not real calendar validity (see the NOTE in `studentRegEx.js` /
  `enrollmentRegEx.js`).

---

## 8. Authentication & authorization

- **Session token**: signed on login (`UserServices.login`) with
  `{ id, role }`, stored in an **httpOnly** cookie named `authentication`.
  `authAppVerifyToken` (`src/middlewares/tokenHandlers/authAppTokenHandler.js`)
  verifies it on every protected request, then **rotates** it (new 1h
  token, same cookie name) and exposes the fresh value both by resetting
  the cookie and via `res.locals.newUserToken`, so non-browser clients
  (e.g. a React SPA reading the body) can also pick up the rotated value.
- **API key**: every route (including login) is gated by `checkApiKey`,
  which compares the `apikey` header against `config.APIKey`. This is a
  shared secret identifying the *client application*, not the end user —
  it must never be exposed to end users and should be attached
  server-side by the frontend, not from browser JS.
- **Roles**: `Máster`, `Administrador`, `Rector`, `Funcionario`, `Auxiliar`
  (see `roleServices.js` `VALID_NAMES` and the `rol` ENUM). `checkRole([...])`
  authorizes based on `req.user.role`, decoded from the JWT — it does
  **not** re-verify the token; it must always run after
  `authAppVerifyToken` in the pipeline.
- **Password reset** (`POST /users/reset-password`) is intentionally
  outside the token pipeline: the user isn't authenticated, so identity is
  verified by requiring `email` **and** `documentNumber` to both match the
  same user record before the password is replaced. No token is issued by
  this endpoint — the user must log in again afterward through the normal
  flow.
- **Login response** uses an identical message for "user not found" and
  "wrong password" to prevent user enumeration — preserve this if you
  touch `controllers/user/login.js`.

---

## 9. Database & migrations

- Tables and columns are named in **Spanish** (`estudiante`,
  `nombre_grado`, `fecha_creacion`); Sequelize model attributes are named
  in **English** (`firstName`, `createdAt`) via the `field:` mapping. Keep
  this translation layer intact — never rename a DB column to English or
  a model attribute to Spanish.
- `id` columns are `INTEGER` auto-increment, mapped as `id_<entity>` at
  the DB level.
- Every table carries `fecha_creacion`/`fecha_modificacion`, mapped to
  Sequelize's automatic `createdAt`/`updatedAt`.
- New schema changes go through `sequelize-cli` migrations (`.cjs`,
  timestamp-prefixed) in `src/db/migrations/` — never hand-edit the DB or
  add a column only in the model file. Run via `npm run migrations:run`.
- Static catalog data (countries, departments, municipalities, genders,
  document types, roles, academic levels, grades) ships as idempotent
  seeders (`INSERT IGNORE` or an existence check) in `src/db/seeders/` —
  follow that pattern for any new catalog data rather than a one-off
  script.
- Respect existing `onDelete` behavior when extending associations:
  `RESTRICT` for hard dependencies (e.g. Role → User), `SET NULL` for
  soft/historical ones (e.g. Student → DocumentType). Don't change a
  constraint's delete behavior without understanding the service-layer
  guard that currently compensates for it (see §5).

---

## 10. Known gaps / things NOT yet implemented

Be aware of these before assuming they exist:

- **No CORS middleware** is configured in `app.js`, despite `cors` being
  a listed dependency. A separately-hosted frontend cannot call this API
  from the browser (with cookies) until this is added.
- **Certificate generation, preview, and PDF output are not yet
  implemented.** The `Certificate`, `CertificateSignature`, and
  `CertificateRecipient` models/services/routes exist for recipients and
  basic CRUD, but the actual generation workflow (numbering, PDF
  rendering, delivery registration, reprint flow) described in the
  frontend's `guidelines.md` (§23–27) has no corresponding controller/
  service yet.
- **No automated tests** exist (`npm test` is a stub). Introduce Vitest/
  Jest progressively per new feature, not as a separate future effort.
- **No CSV/historical-data import** endpoints exist yet (frontend
  guidelines §29 describes this as a required feature).
- **No audit/traceability log table** — certificate operations
  (generated/reprinted/downloaded/delivered) aren't yet persisted as
  discrete audit records, only as `certificado.estado_certificado`.
- **Phone ownership** (`phoneServices.js`) enforces "one owner across four
  bridge tables" procedurally at the service layer only — this is not a
  database-level constraint. Any new code path that links a phone must go
  through `linkPhoneToOwner`/`unlinkPhoneFromOwner`, never a direct
  `create()` on a bridge model.

---

## 11. AI agent rules for this repository

These mirror the frontend's `guidelines.md` §56 and apply equally here:

1. **Inspect before modifying.** Read the existing service/controller/
   schema for an entity before touching it; reuse its exact patterns.
2. **Do not invent endpoints or change response shapes** without
   updating the corresponding schema, controller, and — critically — the
   frontend's expectations. This API is already consumed by a frontend
   built to its current contract.
3. **Do not duplicate business rules on the frontend's behalf** — if the
   frontend needs a new derived value or computed status, add it here and
   return it, don't expect the frontend to compute it.
4. **Small, incremental changes.** One entity/feature per change set.
5. **Preserve existing behavior**: don't alter response field names,
   remove the `authentication` echo, change the pipeline order, or modify
   an `onDelete` constraint as a side effect of an unrelated feature.
6. **Explain new dependencies** before adding them — the current
   dependency list (§2) is intentionally minimal.
7. **Never commit real secrets.** `.env` is git-ignored; only
   `env/.envExample` (with obviously placeholder-shaped values) belongs
   in version control.
8. **When a request implies a new business rule** (e.g. "students can't
   be deleted with active enrollments"), implement it as a service-layer
   guard with a `Boom.conflict`, matching the existing pattern — not as
   inline logic in a controller or a raw DB constraint alone.

---

## 12. Adding a new entity — checklist

When asked to add a new resource, follow the existing entities' shape
end-to-end:

- [ ] Migration (`src/db/migrations/`) + model (`src/db/models/`)
- [ ] Associations added in `src/db/models/index.js`
- [ ] RegEx patterns (`src/utils/RegEx/<entity>RegEx.js`)
- [ ] Joi schema (`src/schemas/<entity>Schema.js`)
- [ ] Service class (`src/services/<entity>Services.js`) with
      create/update/delete/listOne/listAll + any domain-specific lookups,
      following §5
- [ ] One controller file per operation (`src/controllers/<entity>/`),
      following §6
- [ ] Router (`src/routes/<entity>Router.js`) with the full middleware
      pipeline per route, correct role restrictions, mounted in
      `src/routes/index.js`
- [ ] Seeder if the entity is a static catalog
- [ ] Update this file's §10 if the change closes a known gap
