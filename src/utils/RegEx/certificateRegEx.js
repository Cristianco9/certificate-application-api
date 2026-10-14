// The pattern ensures the official record/act number follows the
// institution's auto-generated format: two digits from the current
// year (e.g. '26' for 2026) followed by a hyphen and a 3-digit
// consecutive number that resets every year and starts at 001.
// Examples: '26-001', '26-089', '27-124'.
// Matches the VARCHAR(30) column size defined in
// certificado.numero_acta_certificado
export const certificateActNumber = /^\d{2}-\d{3}$/;

// Validates a partial act-number input for the search-by-act-number
// endpoint. Accepts '2', '26', '26-', '26-0', '26-00' or '26-001'.
export const partialCertificateActNumber = /^\d{1,2}(-\d{0,3})?$/;

// The pattern ensures the certificate id contains only numbers
// and is between 1 to 10 digits long, matching the INTEGER primary key
// defined in certificado.id_certificado
export const certificateId = /^\d{1,10}$/;

// The pattern ensures the foreign key to Usuario contains only numbers
// and is between 1 to 10 digits long, matching the INTEGER foreign key
// defined in certificado.id_usuario_certificado
export const certificateUserId = /^\d{1,10}$/;

// The pattern ensures the foreign key to Institucion contains only
// numbers and is between 1 to 10 digits long, matching the INTEGER
// foreign key defined in certificado.id_institucion_certificado
export const certificateInstitutionId = /^\d{1,10}$/;

// The pattern ensures the foreign key to Matricula contains only
// numbers and is between 1 to 10 digits long, matching the INTEGER
// foreign key defined in certificado.id_matricula_certificado
export const certificateEnrollmentId = /^\d{1,10}$/;

// The pattern ensures the foreign key to ReceptorCertificado contains
// only numbers and is between 1 to 10 digits long, matching the
// INTEGER foreign key defined in certificado.id_receptor_certificado.
// This field is nullable at the database level, so the schema layer
// (Joi) is responsible for allowing an empty value where applicable.
export const certificateRecipientId = /^\d{1,10}$/;

// NOTE: 'fecha_emision_certificado' (DATE) y 'estado_certificado'
// (ENUM('EMITIDO','ANULADO','REIMPRESO')) are not covered by regular
// expressions here. Date values are validated at the schema layer with
// Joi.date(), and enumerated values with Joi.valid(...), both of which
// offer more appropriate native validation than a text-based pattern.
