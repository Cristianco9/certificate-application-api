// ────────────────────────────────────────────────────────────────────────────
// CERTIFICATE RECIPIENT PHONE ROUTER
// Entity: CertificateRecipientPhone | Table: receptor_certificado_telefono
//
// Defines and exposes the HTTP endpoints used to manage the
// "certificate-recipient-phone" bridge table. This bridge links a
// CertificateRecipient to one of their Phone records. Unlike
// PhoneServices (which exposes the phone catalog itself and the generic
// owner-linking methods), this router is scoped exclusively to the
// CertificateRecipient side of the ownership relationship.
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
// (Máster, Administrador, Rector, Secretario), while reads are open to
// the same set.
//
// Mounted at: /app/v1/certificate-recipient-phones  (see src/routes/index.js)
// ────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { certificateRecipientPhoneSchema } from '../schemas/certificateRecipientPhoneSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneCertificateRecipientPhone } from '../controllers/certificateRecipientPhone/create.js';
import { deleteOneCertificateRecipientPhone } from '../controllers/certificateRecipientPhone/delete.js';
import { unlinkCertificateRecipientPhone } from '../controllers/certificateRecipientPhone/unlinkByCertificateRecipientAndPhone.js';
import { listOneCertificateRecipientPhone } from '../controllers/certificateRecipientPhone/listOne.js';
import { listAllCertificateRecipientPhones } from '../controllers/certificateRecipientPhone/listAll.js';
import { listCertificateRecipientPhonesByCertificateRecipient } from '../controllers/certificateRecipientPhone/listByCertificateRecipient.js';
import { listCertificateRecipientPhonesByPhone } from '../controllers/certificateRecipientPhone/listByPhone.js';
import { getCertificateRecipientPhoneByCertificateRecipientAndPhone } from '../controllers/certificateRecipientPhone/getByCertificateRecipientAndPhone.js';

// Create a new Router instance dedicated to the certificate-recipient-phone resource
const certificateRecipientPhoneRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Link a phone to a certificate recipient
// Body: { certificateRecipientId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientPhoneRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateRecipientPhoneSchema.newCertificateRecipientPhoneData, 'body'),
  createOneCertificateRecipientPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every certificate-recipient-phone link
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientPhoneRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  listAllCertificateRecipientPhones
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /list-one  →  Retrieve a single certificate-recipient-phone link by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientPhoneRouter.post(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateRecipientPhoneSchema.getCertificateRecipientPhoneById, 'body'),
  listOneCertificateRecipientPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-certificate-recipient  →  List every phone linked to a
// given certificate recipient
// Body: { certificateRecipientId }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientPhoneRouter.post(
  '/get-by-certificate-recipient',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateRecipientPhoneSchema.listCertificateRecipientPhonesByCertificateRecipient, 'body'),
  listCertificateRecipientPhonesByCertificateRecipient
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-phone  →  List every certificate recipient linked to a
// given phone
// Body: { phoneId }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientPhoneRouter.post(
  '/get-by-phone',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateRecipientPhoneSchema.listCertificateRecipientPhonesByPhone, 'body'),
  listCertificateRecipientPhonesByPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-certificate-recipient-and-phone  →  Retrieve the link (if
// any) between a specific certificate recipient and a specific phone
// Body: { certificateRecipientId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientPhoneRouter.post(
  '/get-by-certificate-recipient-and-phone',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateRecipientPhoneSchema.getCertificateRecipientPhoneByCertificateRecipientAndPhone, 'body'),
  getCertificateRecipientPhoneByCertificateRecipientAndPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a certificate-recipient-phone link by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientPhoneRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateRecipientPhoneSchema.deleteCertificateRecipientPhone, 'body'),
  deleteOneCertificateRecipientPhone
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /unlink  →  Delete a certificate-recipient-phone link by
// composite key (certificateRecipientId + phoneId). Convenience endpoint
// for callers that already hold both FK values.
// Body: { certificateRecipientId, phoneId }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientPhoneRouter.delete(
  '/unlink',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Secretario']),
  validatorHandler(certificateRecipientPhoneSchema.unlinkCertificateRecipientPhone, 'body'),
  unlinkCertificateRecipientPhone
);

export default certificateRecipientPhoneRouter;
