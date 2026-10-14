// ────────────────────────────────────────────────────────────────────────────
// CERTIFICATE SIGNATURE ROUTER
// Entity: CertificateSignature | Table: firma_certificado
//
// Defines and exposes the HTTP endpoints used to manage the
// "certificate-signature" entity. A signature binds a signer (User) to
// a Certificate in a Municipality. Because 'id_usuario_firmacertificado'
// is UNIQUE, a user can only ever be registered as a signer once — hence
// the singular 'get-by-signer' lookup, while 'get-by-certificate'
// returns a collection since a certificate can carry many signatures.
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
// Role policy: mirrors the certificate recipient entity's own role split
// (Máster, Administrador, Rector, Secretario), since a signature is
// only meaningful in the certificate-issuance workflow.
//
// Mounted at: /app/v1/certificate-signatures  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { certificateSignatureSchema } from '../schemas/certificateSignatureSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneCertificateSignature } from '../controllers/certificateSignature/create.js';
import { updateOneCertificateSignature } from '../controllers/certificateSignature/update.js';
import { deleteOneCertificateSignature } from '../controllers/certificateSignature/delete.js';
import { listOneCertificateSignature } from '../controllers/certificateSignature/listOne.js';
import { listAllCertificateSignatures } from '../controllers/certificateSignature/listAll.js';
import { listCertificateSignaturesByCertificate } from '../controllers/certificateSignature/listByCertificate.js';
import { listCertificateSignaturesByMunicipality } from '../controllers/certificateSignature/listByMunicipality.js';
import { getCertificateSignatureBySigner } from '../controllers/certificateSignature/getBySigner.js';
import { getCertificateSignatureByCertificateAndSigner } from '../controllers/certificateSignature/getByCertificateAndSigner.js';

// Create a new Router instance dedicated to the certificate-signature resource
const certificateSignatureRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Register a new signature on a certificate
// Body: { userId, certificateId, municipalityId }
// ─────────────────────────────────────────────────────────────────────────────
certificateSignatureRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSignatureSchema.newCertificateSignatureData, 'body'),
  createOneCertificateSignature
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every certificate signature
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
certificateSignatureRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  listAllCertificateSignatures
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single certificate signature by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
certificateSignatureRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateSignatureSchema.getCertificateSignatureById, 'body'),
  listOneCertificateSignature
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-certificate  →  List every signature attached to a given
// certificate (a certificate can carry many signatures)
// Body: { certificateId }
// ─────────────────────────────────────────────────────────────────────────────
certificateSignatureRouter.post(
  '/get-by-certificate',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateSignatureSchema.listCertificateSignaturesByCertificate, 'body'),
  listCertificateSignaturesByCertificate
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-municipality  →  List every signature executed in a given
// municipality
// Body: { municipalityId }
// ─────────────────────────────────────────────────────────────────────────────
certificateSignatureRouter.post(
  '/get-by-municipality',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateSignatureSchema.listCertificateSignaturesByMunicipality, 'body'),
  listCertificateSignaturesByMunicipality
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-signer  →  Retrieve the single signature record registered
// for a given signer. Returns one record, not a collection, because the
// signer FK is UNIQUE on this table.
// Body: { userId }
// ─────────────────────────────────────────────────────────────────────────────
certificateSignatureRouter.post(
  '/get-by-signer',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSignatureSchema.getCertificateSignatureBySigner, 'body'),
  getCertificateSignatureBySigner
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-certificate-and-signer  →  Retrieve the link (if any)
// between a specific certificate and a specific signer
// Body: { certificateId, userId }
// ─────────────────────────────────────────────────────────────────────────────
certificateSignatureRouter.post(
  '/get-by-certificate-and-signer',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateSignatureSchema.getCertificateSignatureByCertificateAndSigner, 'body'),
  getCertificateSignatureByCertificateAndSigner
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing certificate signature
// Body: { id, certificateId?, municipalityId? }
// 'userId' is intentionally not updatable here — changing the signer is
// semantically a delete + create, given the UNIQUE constraint.
// ─────────────────────────────────────────────────────────────────────────────
certificateSignatureRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateSignatureSchema.updateCertificateSignatureData, 'body'),
  updateOneCertificateSignature
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a certificate signature by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
certificateSignatureRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateSignatureSchema.deleteCertificateSignature, 'body'),
  deleteOneCertificateSignature
);

export default certificateSignatureRouter;
