// ────────────────────────────────────────────────────────────────────────────
// COUNTRY ROUTER
// Entity: Country | Table: pais
//
// Defines and exposes the HTTP endpoints used to manage the "country"
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
// Mounted at: /app/v1/countries  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

// Import the Router class from Express to create an isolated routing instance
import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

// Middleware that validates a request property against a Joi schema
import { validatorHandler } from '../middlewares/validatorHandler.js';
// Middleware that verifies the API key sent by the client app
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
// Middleware that verifies the authentication JWT and regenerates it on success
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
// Middleware factory that restricts access based on the user's role
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

// Joi schema collection for the country entity
import { countrySchema } from '../schemas/countrySchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneCountry } from '../controllers/country/create.js';
import { listAllCountries } from '../controllers/country/Listall.js';
import { listOneCountry } from '../controllers/country/Listone.js';
import { searchCountriesByName } from '../controllers/country/SearchByName.js';
import { getCountryByIso2Code } from '../controllers/country/Getbyiso2code.js';
import { updateOneCountry } from '../controllers/country/update.js';
import { deleteOneCountry } from '../controllers/country/delete.js';

// Create a new Router instance dedicated to the country resource
const countryRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new country
// Body: { name, iso2Code? }
// ─────────────────────────────────────────────────────────────────────────────
countryRouter.post(
  '/create',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the creation payload
  validatorHandler(countrySchema.newCountryData, 'body'),
  // Step 5: delegate to the controller
  createOneCountry
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every country
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
countryRouter.get(
  '/list-all',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master, Administrator, and auxiliar roles
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  // Step 4: no schema — this endpoint takes no input parameters
  // Step 5: delegate to the controller
  listAllCountries
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single country by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
countryRouter.post(
  '/list-one',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master, Administrator, and auxiliar roles
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  // Step 4: validate that a valid id was provided
  validatorHandler(countrySchema.getCountryById, 'body'),
  // Step 5: delegate to the controller
  listOneCountry
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-name  →  Search countries by partial name
// Body: { partialName }
// ─────────────────────────────────────────────────────────────────────────────
countryRouter.post(
  '/search-by-name',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the partial search text
  validatorHandler(countrySchema.searchCountriesByName, 'body'),
  // Step 5: delegate to the controller
  searchCountriesByName
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-iso2-code  →  Retrieve a single country by its ISO 3166-1
// alpha-2 code
// Body: { iso2Code }
// ─────────────────────────────────────────────────────────────────────────────
countryRouter.post(
  '/get-by-iso2-code',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the ISO code
  validatorHandler(countrySchema.getCountryByIso2Code, 'body'),
  // Step 5: delegate to the controller
  getCountryByIso2Code
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing country
// Body: { id, name?, iso2Code? }
// ─────────────────────────────────────────────────────────────────────────────
countryRouter.patch(
  '/update',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate the update payload
  validatorHandler(countrySchema.updateCountryData, 'body'),
  // Step 5: delegate to the controller
  updateOneCountry
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a country by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
countryRouter.delete(
  '/delete',
  // Step 1: verify the API key
  checkApiKey,
  // Step 2: verify the session token
  authAppVerifyToken,
  // Step 3: authorize just Master and Administrator roles
  checkRole(['Máster', 'Administrador']),
  // Step 4: validate that a valid id was provided
  validatorHandler(countrySchema.deleteCountry, 'body'),
  // Step 5: delegate to the controller
  deleteOneCountry
);

// Export the configured router for registration in the main router (index.js)
export default countryRouter;
