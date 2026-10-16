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
// plus a 3-digit consecutive number (e.g. '26-001'). 'userId' and
// 'institutionId' are immutable after creation because they are the
// identity of the certificate.
//
// A certificate now covers ONE OR MANY enrollments via the bridge table
// 'certificado_matricula'. That is why 'enrollmentIds' is an ARRAY of
// digit-strings (min 1, no duplicates) in newCertificateData, and why
// 'enrollmentId' is intentionally NOT a mutable field in
// updateCertificateData — the set of enrollments tied to a certificate
// is fixed at creation time. Reassigning them is semantically a
// delete + create.
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

// Backs a single element of CertificateServices.createOne's enrollmentIds
// array. Each element maps to bridge.id_matricula, which is UNIQUE — an
// enrollment can belong to at most one certificate.
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
  // Returns the single certificate (if any) that owns the given
  // enrollment, resolved through the bridge table 'certificado_matricula'.
  // The bridge enforces UNIQUE on id_matricula, so at most one certificate
  // can ever be returned.
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
  //                              enrollmentIds: [...], recipientId?, status? })
  // Validates CertificateServices.createOne(newCertificate). The
  // 'actNumber' is auto-generated server-side. 'status' defaults to
  // 'EMITIDO' in the service when omitted.
  //
  // 'enrollmentIds' is the new shape: an ARRAY of 1..N enrollment ids
  // that must all be valid digit-strings, must not contain duplicates,
  // and must all currently be unowned by any other certificate (the
  // service rejects already-linked enrollments with a Boom.conflict).
  // This is what makes a single act number cover many enrollments and
  // a single PDF render many report cards.
  newCertificateData: Joi.object({
    issueDate: joiIssueDate.required(),
    userId: joiUserId.required(),
    institutionId: joiInstitutionId.required(),

    enrollmentIds: Joi.array()
      .items(joiEnrollmentId)
      .min(1)
      .unique()
      .required()
      .messages({
        'array.base': 'Los ids de matrícula deben enviarse como un arreglo.',
        'array.min': 'Debe seleccionar al menos una matrícula.',
        'array.unique': 'No se permiten matrículas duplicadas en el mismo certificado.',
        'any.required': 'Debe enviar al menos una matrícula (enrollmentIds).',
      }),

    recipientId: joiRecipientId.optional().allow(null, ''),
    status: joiStatus.optional(),
  }),

  // PATCH /certificates (body: { id, issueDate?, recipientId?, status? })
  // Validates BOTH arguments of CertificateServices.updateOne
  // (certificateId, newCertificateData) in a single object. 'userId',
  // 'institutionId' and the enrollment set are intentionally NOT
  // mutable: the first two are the certificate's identity, and the
  // enrollment set is fixed at creation time (changing it is
  // semantically a delete + create, per the UNIQUE rule on the bridge).
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

  // POST /certificates/list-paginated
  // Body: { offset?, limit?, filters?: {...} }
  //
  // Repository listing. Every filter is optional — the operator can hit
  // "Buscar" with no filters and page through the whole history. The
  // schema validates shapes only; cross-field consistency (e.g. a
  // documentNumber that is longer than 10 digits when the type is a
  // cédula) is enforced by the backend service where it belongs.
  listPaginated: Joi.object({
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(100).default(20),
    filters: Joi.object({
      // Certificate
      actNumber: Joi.string().allow('').optional(),
      issuerId: Joi.string().pattern(/^\d{1,10}$/).allow('').optional(),
      status: Joi.string()
        .valid('EMITIDO', 'ANULADO', 'REIMPRESO')
        .allow('')
        .optional(),
      institutionId: Joi.string().pattern(/^\d{1,10}$/).allow('').optional(),
      issueDateFrom: Joi.string().allow('').optional(),
      issueDateTo: Joi.string().allow('').optional(),

      // Student
      firstName: Joi.string().allow('').optional(),
      secondName: Joi.string().allow('').optional(),
      firstLastName: Joi.string().allow('').optional(),
      secondLastName: Joi.string().allow('').optional(),
      documentNumber: Joi.string().allow('').optional(),
      documentTypeId: Joi.string().pattern(/^\d{1,10}$/).allow('').optional(),
      birthDate: Joi.string().allow('').optional(),

      // Enrollment (group)
      year: Joi.string().pattern(/^(19\d{2}|20\d{2})$/).allow('').optional(),
      gradeId: Joi.string().pattern(/^\d{1,10}$/).allow('').optional(),
      group: Joi.string().allow('').optional(),
      jornada: Joi.string().valid('Diurna', 'Nocturna').allow('').optional(),

      // Recipient
      recipientName: Joi.string().allow('').optional(),
      recipientDocument: Joi.string().allow('').optional(),
    })
      .optional()
      .default({}),
  }),
};
