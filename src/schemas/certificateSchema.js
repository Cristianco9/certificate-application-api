// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATE SCHEMA — Joi Validation
// Entity: Certificate | Table: certificado
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps 1:1 to the public methods of CertificateServices. The frontend
// sends every value through the request body — never via URL params or
// query string — so every schema below is meant to be applied as
// validatorHandler(schema, 'body'), including the ones that only carry
// an id. Methods that take one or more primitive arguments on the
// service side are still validated as a small object with one (or more)
// named keys, since Joi always validates an object shape.
//
// The 'actNumber' is NOT part of newCertificateData: it is generated
// server-side by the service from the current year's last two digits
// plus a 3-digit consecutive number (e.g. '26-001'). 'userId',
// 'institutionId' and 'enrollmentId' are immutable after creation
// because they are the identity of the certificate — an enrollmentId
// is UNIQUE (a reprint reuses the same certificate record), so changing
// it is semantically a delete + create.
// ─────────────────────────────────────────────────────────────────────────────

import Joi from 'joi';

import {
  certificateId,
  certificateActNumber,
  partialCertificateActNumber,
  certificateUserId,
  certificateInstitutionId,
  certificateEnrollmentId,
  certificateRecipientId,
} from '../utils/RegEx/certificateRegEx.js';

// ── Primitive Joi types ─────────────────────────────────────────────────────

// Backs Certificate.id ('id_certificado'). Kept as a string pattern, not
// Joi.number(), since certificateId is a digit-string RegEx.
const joiId = Joi.string().pattern(certificateId).messages({
  'string.base': 'El id debe ser una cadena de texto.',
  'string.pattern.base': 'El id debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs Certificate.actNumber ('numero_acta_certificado'). Exact lookup.
const joiActNumber = Joi.string().pattern(certificateActNumber).messages({
  'string.base': 'El número de acta debe ser una cadena de texto.',
  'string.pattern.base': "El número de acta debe tener el formato 'YY-NNN' (ejemplo: '26-001').",
});

// Backs Certificate.actNumber for partial search.
const joiPartialActNumber = Joi.string().pattern(partialCertificateActNumber).messages({
  'string.base': 'El número de acta parcial debe ser una cadena de texto.',
  'string.pattern.base': "El número de acta parcial debe empezar por 1 o 2 dígitos de año y opcionalmente un guion y hasta 3 dígitos (ejemplo: '26-0').",
});

// Backs Certificate.issueDate ('fecha_emision_certificado'). Native Joi
// date rather than a RegEx, since Joi.date() checks real calendar
// validity (format-only patterns would accept impossible dates).
const joiIssueDate = Joi.date().messages({
  'date.base': 'La fecha de emisión debe ser una fecha válida.',
});

// Backs Certificate.userId ('id_usuario_certificado').
const joiUserId = Joi.string().pattern(certificateUserId).messages({
  'string.base': 'El id del usuario emisor debe ser una cadena de texto.',
  'string.pattern.base': 'El id del usuario emisor debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs Certificate.institutionId ('id_institucion_certificado').
const joiInstitutionId = Joi.string().pattern(certificateInstitutionId).messages({
  'string.base': 'El id de la institución debe ser una cadena de texto.',
  'string.pattern.base': 'El id de la institución debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs Certificate.enrollmentId ('id_matricula_certificado'). UNIQUE:
// a given enrollment can only ever have one certificate issued for it.
const joiEnrollmentId = Joi.string().pattern(certificateEnrollmentId).messages({
  'string.base': 'El id de la matrícula debe ser una cadena de texto.',
  'string.pattern.base': 'El id de la matrícula debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs Certificate.recipientId ('id_receptor_certificado'). Nullable.
const joiRecipientId = Joi.string().pattern(certificateRecipientId).messages({
  'string.base': 'El id del receptor debe ser una cadena de texto.',
  'string.pattern.base': 'El id del receptor debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs Certificate.status ('estado_certificado'). ENUM.
const joiStatus = Joi.string().valid('EMITIDO', 'ANULADO', 'REIMPRESO').messages({
  'string.base': 'El estado debe ser una cadena de texto.',
  'any.only': 'El estado debe ser "EMITIDO", "ANULADO" o "REIMPRESO".',
});

// ── Schema export ────────────────────────────────────────────────────────────

export const certificateSchema = {

  // POST /certificates/get-by-id (body: { id })
  getCertificateById: Joi.object({
    id: joiId.required(),
  }),

  // GET /certificates/list-all → no input parameters, no schema applied.

  // POST /certificates/get-by-act-number (body: { actNumber })
  getCertificateByActNumber: Joi.object({
    actNumber: joiActNumber.required(),
  }),

  // POST /certificates/search-by-act-number (body: { partialActNumber })
  searchCertificatesByActNumber: Joi.object({
    partialActNumber: joiPartialActNumber.required(),
  }),

  // POST /certificates/get-by-enrollment (body: { enrollmentId })
  // Returns a single record, not a collection, because enrollmentId is
  // UNIQUE on 'certificado'.
  getCertificateByEnrollment: Joi.object({
    enrollmentId: joiEnrollmentId.required(),
  }),

  // POST /certificates/get-by-user (body: { userId })
  listCertificatesByUser: Joi.object({
    userId: joiUserId.required(),
  }),

  // POST /certificates/get-by-institution (body: { institutionId })
  listCertificatesByInstitution: Joi.object({
    institutionId: joiInstitutionId.required(),
  }),

  // POST /certificates/get-by-recipient (body: { recipientId })
  listCertificatesByRecipient: Joi.object({
    recipientId: joiRecipientId.required(),
  }),

  // POST /certificates/get-by-status (body: { status })
  listCertificatesByStatus: Joi.object({
    status: joiStatus.required(),
  }),

  // POST /certificates (body: { issueDate, userId, institutionId,
  //                              enrollmentId, recipientId?, status? })
  // Validates CertificateServices.createOne(newCertificate). The
  // 'actNumber' is auto-generated server-side. 'status' defaults to
  // 'EMITIDO' in the service when omitted.
  newCertificateData: Joi.object({
    issueDate: joiIssueDate.required(),
    userId: joiUserId.required(),
    institutionId: joiInstitutionId.required(),
    enrollmentId: joiEnrollmentId.required(),
    recipientId: joiRecipientId.optional().allow(null, ''),
    status: joiStatus.optional(),
  }),

  // PATCH /certificates (body: { id, issueDate?, recipientId?, status? })
  // Validates BOTH arguments of CertificateServices.updateOne
  // (certificateId, newCertificateData) in a single object. 'userId',
  // 'institutionId' and 'enrollmentId' are intentionally NOT mutable:
  // they are the certificate's identity, and 'enrollmentId' is UNIQUE.
  updateCertificateData: Joi.object({
    id: joiId.required(),
    issueDate: joiIssueDate,
    recipientId: joiRecipientId.optional().allow(null, ''),
    status: joiStatus,
  }).or('issueDate', 'recipientId', 'status').messages({
    'object.missing': 'Debe proporcionar al menos uno de los campos issueDate, recipientId o status para actualizar el certificado.',
  }),

  // DELETE /certificates (body: { id })
  deleteCertificate: Joi.object({
    id: joiId.required(),
  }),
};
