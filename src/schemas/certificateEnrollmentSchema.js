// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATE ENROLLMENT SCHEMA — Joi Validation
// Entity: CertificateEnrollment | Table: certificado_matricula
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps 1:1 to the public methods of CertificateEnrollmentServices. The
// frontend sends every value through the request body — never via URL
// params or query string — so every schema below is meant to be applied as
// validatorHandler(schema, 'body'), including the ones that only carry an
// id. Methods that take one or more primitive arguments on the service
// side (listOne, deleteOne, listByCertificate, listByEnrollment,
// getByCertificateAndEnrollment, unlinkByCertificateAndEnrollment) are
// still validated as a small object with one (or more) named keys, since
// Joi always validates an object shape.
//
// No 'update' schema exists: certificateId and enrollmentId are the only
// mutable columns on the bridge, and changing either of them is
// semantically a delete + create, not an in-place update.
// ─────────────────────────────────────────────────────────────────────────────

import Joi from 'joi';

import {
  certificateEnrollmentId,
  certificateEnrollmentCertificateId,
  certificateEnrollmentEnrollmentId,
} from '../utils/RegEx/certificateEnrollmentRegEx.js';

// ── Primitive Joi types ─────────────────────────────────────────────────────

// Backs CertificateEnrollment.id ('id_certificado_matricula'). Kept as a
// string pattern, not Joi.number(), since certificateEnrollmentId is a
// digit-string RegEx.
const joiId = Joi.string().pattern(certificateEnrollmentId).messages({
  'string.base': 'El id debe ser una cadena de texto.',
  'string.pattern.base': 'El id debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs CertificateEnrollment.certificateId ('id_certificado'), the
// foreign key to Certificate.
const joiCertificateId = Joi.string().pattern(certificateEnrollmentCertificateId).messages({
  'string.base': 'El id del certificado debe ser una cadena de texto.',
  'string.pattern.base': 'El id del certificado debe contener solo dígitos (1 a 10 dígitos).',
});

// Backs CertificateEnrollment.enrollmentId ('id_matricula'), the foreign
// key to Enrollment. UNIQUE: an enrollment belongs to at most one
// certificate.
const joiEnrollmentId = Joi.string().pattern(certificateEnrollmentEnrollmentId).messages({
  'string.base': 'El id de la matrícula debe ser una cadena de texto.',
  'string.pattern.base': 'El id de la matrícula debe contener solo dígitos (1 a 10 dígitos).',
});

// ── Schema export ────────────────────────────────────────────────────────────

export const certificateEnrollmentSchema = {

  // POST /certificate-enrollments/get-by-id (body: { id })
  // Validates CertificateEnrollmentServices.listOne(certificateEnrollmentId)
  getCertificateEnrollmentById: Joi.object({
    id: joiId.required(),
  }),

  // GET /certificate-enrollments/list-all → no input parameters, no schema applied.

  // POST /certificate-enrollments/get-by-certificate (body: { certificateId })
  // Validates CertificateEnrollmentServices.listByCertificate(certificateId).
  // Returns a collection: a certificate carries one or many enrollments.
  listCertificateEnrollmentsByCertificate: Joi.object({
    certificateId: joiCertificateId.required(),
  }),

  // POST /certificate-enrollments/get-by-enrollment (body: { enrollmentId })
  // Validates CertificateEnrollmentServices.listByEnrollment(enrollmentId).
  // Returns at most one record, since enrollmentId is UNIQUE.
  listCertificateEnrollmentsByEnrollment: Joi.object({
    enrollmentId: joiEnrollmentId.required(),
  }),

  // POST /certificate-enrollments/get-by-certificate-and-enrollment
  // (body: { certificateId, enrollmentId })
  // Validates CertificateEnrollmentServices.getByCertificateAndEnrollment(certificateId, enrollmentId)
  getCertificateEnrollmentByCertificateAndEnrollment: Joi.object({
    certificateId: joiCertificateId.required(),
    enrollmentId: joiEnrollmentId.required(),
  }),

  // POST /certificate-enrollments/create (body: { certificateId, enrollmentId })
  // Validates CertificateEnrollmentServices.createOne(newCertificateEnrollment)
  newCertificateEnrollmentData: Joi.object({
    certificateId: joiCertificateId.required(),
    enrollmentId: joiEnrollmentId.required(),
  }),

  // DELETE /certificate-enrollments/delete (body: { id })
  // Validates CertificateEnrollmentServices.deleteOne(certificateEnrollmentId)
  deleteCertificateEnrollment: Joi.object({
    id: joiId.required(),
  }),

  // DELETE /certificate-enrollments/unlink (body: { certificateId, enrollmentId })
  // Validates CertificateEnrollmentServices.unlinkByCertificateAndEnrollment(certificateId, enrollmentId)
  unlinkCertificateEnrollment: Joi.object({
    certificateId: joiCertificateId.required(),
    enrollmentId: joiEnrollmentId.required(),
  }),
};
