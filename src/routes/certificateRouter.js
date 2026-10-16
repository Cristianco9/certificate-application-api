// ────────────────────────────────────────────────────────────────────────────
// CERTIFICATE ROUTER
// Entity: Certificate | Table: certificado
//
// Defines and exposes the HTTP endpoints used to manage the "certificate"
// entity. A certificate is issued by a User, under an Institution, for
// a specific Enrollment, and optionally handed to a CertificateRecipient.
//
// The official act number ('numero_acta_certificado') is auto-generated
// by CertificateServices in the format 'YY-NNN' (last two digits of the
// current year + a 3-digit consecutive that resets every year and starts
// at 001). It is never accepted as input.
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
// Mounted at: /api/v1/certificates  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { certificateSchema } from '../schemas/certificateSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneCertificate } from '../controllers/certificate/create.js';
import { updateOneCertificate } from '../controllers/certificate/update.js';
import { deleteOneCertificate } from '../controllers/certificate/delete.js';
import { listOneCertificate } from '../controllers/certificate/listOne.js';
import { listAllCertificates } from '../controllers/certificate/listAll.js';
import { getCertificateByActNumber } from '../controllers/certificate/getByActNumber.js';
import { searchCertificatesByActNumber } from '../controllers/certificate/searchByActNumber.js';
import { getCertificateByEnrollment } from '../controllers/certificate/getByEnrollment.js';
import { listCertificatesByUser } from '../controllers/certificate/listByUser.js';
import { listCertificatesByInstitution } from '../controllers/certificate/listByInstitution.js';
import { listCertificatesByRecipient } from '../controllers/certificate/listByRecipient.js';
import { listCertificatesByStatus } from '../controllers/certificate/listByStatus.js';
import { getNextCertificateActNumber } from '../controllers/certificate/getNextActNumber.js';

// Create a new Router instance dedicated to the certificate resource
const certificateRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Issue a new certificate (act number auto-generated)
// Body: { issueDate, userId, institutionId, enrollmentIds, recipientId?, status? }
//
// 'enrollmentIds' is an ARRAY of 1..N enrollment ids — one act number can
// cover many enrollments, each of which is stored as a row in the
// 'certificado_matricula' bridge table. See CertificateServices.createOne.
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSchema.newCertificateData, 'body'),
  createOneCertificate
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every certificate
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  listAllCertificates
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single certificate by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSchema.getCertificateById, 'body'),
  listOneCertificate
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-act-number  →  Retrieve a certificate by its exact act number
// Body: { actNumber }
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.post(
  '/get-by-act-number',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSchema.getCertificateByActNumber, 'body'),
  getCertificateByActNumber
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-act-number  →  Search certificates by partial act number
// Body: { partialActNumber }
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.post(
  '/search-by-act-number',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSchema.searchCertificatesByActNumber, 'body'),
  searchCertificatesByActNumber
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-enrollment  →  Retrieve the single certificate (if any) that
// owns the given enrollment. Returns one record, not a collection, because
// the bridge table 'certificado_matricula' enforces UNIQUE on id_matricula —
// an enrollment can belong to at most one certificate.
// Body: { enrollmentId }
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.post(
  '/get-by-enrollment',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSchema.getCertificateByEnrollment, 'body'),
  getCertificateByEnrollment
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-user  →  List certificates issued by a given user
// Body: { userId }
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.post(
  '/get-by-user',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSchema.listCertificatesByUser, 'body'),
  listCertificatesByUser
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-institution  →  List certificates issued under a given institution
// Body: { institutionId }
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.post(
  '/get-by-institution',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSchema.listCertificatesByInstitution, 'body'),
  listCertificatesByInstitution
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-recipient  →  List certificates delivered to a given recipient
// Body: { recipientId }
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.post(
  '/get-by-recipient',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSchema.listCertificatesByRecipient, 'body'),
  listCertificatesByRecipient
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-status  →  List certificates in a given status
// (EMITIDO / ANULADO / REIMPRESO)
// Body: { status }
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.post(
  '/get-by-status',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSchema.listCertificatesByStatus, 'body'),
  listCertificatesByStatus
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /next-act-number  →  Preview the next act number (no record created)
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.get(
  '/next-act-number',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  getNextCertificateActNumber
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing certificate
// Body: { id, issueDate?, recipientId?, status? }
// 'userId', 'institutionId', 'enrollmentId' and 'actNumber' are
// intentionally NOT mutable — they are the certificate's identity.
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSchema.updateCertificateData, 'body'),
  updateOneCertificate
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a certificate by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
certificateRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster']),
  validatorHandler(certificateSchema.deleteCertificate, 'body'),
  deleteOneCertificate
);

export default certificateRouter;
