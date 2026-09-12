import { Router } from 'express';

// ── Middlewares ─────────────────────────────────────────────────────────────

import { validatorHandler } from '../middlewares/validatorHandler.js';
import { checkApiKey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';

// ── Validation schema ───────────────────────────────────────────────────────

import { certificateRecipientSchema } from '../schemas/certificateRecipientSchema.js';

// ── Controllers ─────────────────────────────────────────────────────────────

import { createOneCertificateRecipient } from '../controllers/certificateRecipient/create.js';
import { updateOneCertificateRecipient } from '../controllers/certificateRecipient/update.js';
import { deleteOneCertificateRecipient } from '../controllers/certificateRecipient/delete.js';
import { listOneCertificateRecipient } from '../controllers/certificateRecipient/listOne.js';
import { listAllCertificateRecipients } from '../controllers/certificateRecipient/listAll.js';
import { searchCertificateRecipientsByName } from '../controllers/certificateRecipient/searchByName.js';
import { getCertificateRecipientByDocumentNumber } from '../controllers/certificateRecipient/getByDocumentNumber.js';
import { listCertificateRecipientsByDocumentType } from '../controllers/certificateRecipient/listByDocumentType.js';

const certificateRecipientRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /create  →  Create a new certificate recipient
// Body: { firstName, lastName, documentTypeId, documentNumber, address }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientRouter.post(
  '/create',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateRecipientSchema.newCertificateRecipientData, 'body'),
  createOneCertificateRecipient
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-all  →  List every certificate recipient
// Body: {} (no payload to validate)
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientRouter.get(
  '/list-all',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  listAllCertificateRecipients
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /list-one  →  Retrieve a single certificate recipient by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientRouter.get(
  '/list-one',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(certificateRecipientSchema.getCertificateRecipientById, 'body'),
  listOneCertificateRecipient
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /search-by-name  →  Search certificate recipients by partial name
// Body: { partialName }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientRouter.post(
  '/search-by-name',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(certificateRecipientSchema.searchCertificateRecipientsByName, 'body'),
  searchCertificateRecipientsByName
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-document-number  →  Retrieve a certificate recipient by exact document number
// Body: { documentNumber }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientRouter.post(
  '/get-by-document-number',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(certificateRecipientSchema.getCertificateRecipientByDocumentNumber, 'body'),
  getCertificateRecipientByDocumentNumber
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /get-by-document-type  →  List certificate recipients by document type
// Body: { documentTypeId }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientRouter.post(
  '/get-by-document-type',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario', 'Auxiliar']),
  validatorHandler(certificateRecipientSchema.listCertificateRecipientsByDocumentType, 'body'),
  listCertificateRecipientsByDocumentType
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /update  →  Update an existing certificate recipient
// Body: { id, firstName?, lastName?, documentTypeId?, documentNumber?, address? }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientRouter.patch(
  '/update',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador', 'Auxiliar']),
  validatorHandler(certificateRecipientSchema.updateCertificateRecipientData, 'body'),
  updateOneCertificateRecipient
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /delete  →  Delete a certificate recipient by id
// Body: { id }
// ─────────────────────────────────────────────────────────────────────────────
certificateRecipientRouter.delete(
  '/delete',
  checkApiKey,
  authAppVerifyToken,
  checkRole(['Máster', 'Administrador']),
  validatorHandler(certificateRecipientSchema.deleteCertificateRecipient, 'body'),
  deleteOneCertificateRecipient
);

export default certificateRecipientRouter;
