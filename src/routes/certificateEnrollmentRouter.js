// ────────────────────────────────────────────────────────────────────────────
// CERTIFICATE ENROLLMENT ROUTER
// Entity: CertificateEnrollment | Table: certificado_matricula
//
// Defines and exposes the HTTP endpoints used to manage the
// "certificate-enrollment" bridge table. This bridge is the many-to-many
// link between Certificate and Enrollment that lets a single act number
// cover one OR MANY enrollments (each one driving a report card inside
// the same certificate PDF).
//
// Two business rules shape this entity:
//   • A certificate can carry MANY enrollments — 'get-by-certificate'
//     therefore returns a collection.
//   • An enrollment can belong to AT MOST ONE certificate — 'id_matricula'
//     is UNIQUE, so 'get-by-enrollment' returns at most one record, and
//     createOne rejects an already-linked enrollment with Boom.conflict.
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
// Role policy: mirrors the certificate-issuance workflow — mutations
// allowed to the roles that can already issue certificates
// (Máster, Administrador, Rector, Secretario), reads to the same set,
// and the low-level 'list-all' / 'list-one' admin views restricted to
// Máster and Administrador.
//
// Mounted at: /api/v1/certificate-enrollments  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { certificateEnrollmentSchema } from '../schemas/certificateEnrollmentSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneCertificateEnrollment } from '../controllers/certificateEnrollment/create.js';
import { deleteOneCertificateEnrollment } from '../controllers/certificateEnrollment/delete.js';
import { unlinkCertificateEnrollment } from '../controllers/certificateEnrollment/unlinkByCertificateAndEnrollment.js';
import { listOneCertificateEnrollment } from '../controllers/certificateEnrollment/listOne.js';
import { listAllCertificateEnrollments } from '../controllers/certificateEnrollment/listAll.js';
import { listCertificateEnrollmentsByCertificate } from '../controllers/certificateEnrollment/listByCertificate.js';
import { listCertificateEnrollmentsByEnrollment } from '../controllers/certificateEnrollment/listByEnrollment.js';
import { getCertificateEnrollmentByCertificateAndEnrollment } from '../controllers/certificateEnrollment/getByCertificateAndEnrollment.js';

// Create a new Router instance dedicated to the certificate-enrollment resource
const certificateEnrollmentRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Link an enrollment to a certificate
// Body: { certificateId, enrollmentId }
// ─────────────────────────────────────────────────────────────────────────────
certificateEnrollmentRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateEnrollmentSchema.newCertificateEnrollmentData, 'body'),
  createOneCertificateEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every certificate-enrollment link
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
certificateEnrollmentRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  listAllCertificateEnrollments
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single certificate-enrollment link by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
certificateEnrollmentRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateEnrollmentSchema.getCertificateEnrollmentById, 'body'),
  listOneCertificateEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-certificate  →  List every enrollment linked to a given
// certificate (a certificate can carry many enrollments)
// Body: { certificateId }
// ─────────────────────────────────────────────────────────────────────────────
certificateEnrollmentRouter.post(
  '/get-by-certificate',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateEnrollmentSchema.listCertificateEnrollmentsByCertificate, 'body'),
  listCertificateEnrollmentsByCertificate
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-enrollment  →  List the certificate(s) owning a given
// enrollment. Returns at most one record, since id_matricula is UNIQUE.
// Body: { enrollmentId }
// ─────────────────────────────────────────────────────────────────────────────
certificateEnrollmentRouter.post(
  '/get-by-enrollment',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateEnrollmentSchema.listCertificateEnrollmentsByEnrollment, 'body'),
  listCertificateEnrollmentsByEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-certificate-and-enrollment  →  Retrieve the link (if any)
// between a specific certificate and a specific enrollment
// Body: { certificateId, enrollmentId }
// ─────────────────────────────────────────────────────────────────────────────
certificateEnrollmentRouter.post(
  '/get-by-certificate-and-enrollment',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateEnrollmentSchema.getCertificateEnrollmentByCertificateAndEnrollment, 'body'),
  getCertificateEnrollmentByCertificateAndEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a certificate-enrollment link by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
certificateEnrollmentRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateEnrollmentSchema.deleteCertificateEnrollment, 'body'),
  deleteOneCertificateEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /unlink  →  Delete a certificate-enrollment link by composite key
// (certificateId + enrollmentId). Convenience endpoint for callers that
// already hold both FK values.
// Body: { certificateId, enrollmentId }
// ─────────────────────────────────────────────────────────────────────────────
certificateEnrollmentRouter.delete(
  '/unlink',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateEnrollmentSchema.unlinkCertificateEnrollment, 'body'),
  unlinkCertificateEnrollment
);

export default certificateEnrollmentRouter;
