// The pattern ensures the certificate-enrollment bridge id contains only
// numbers and is between 1 to 10 digits long, matching the INTEGER primary
// key defined in certificado_matricula.id_certificado_matricula
export const certificateEnrollmentId = /^\d{1,10}$/;

// The pattern ensures the foreign key to Certificado contains only numbers
// and is between 1 to 10 digits long, matching the INTEGER foreign key
// defined in certificado_matricula.id_certificado
export const certificateEnrollmentCertificateId = /^\d{1,10}$/;

// The pattern ensures the foreign key to Matricula contains only numbers
// and is between 1 to 10 digits long, matching the INTEGER foreign key
// defined in certificado_matricula.id_matricula.
// This column carries a UNIQUE index (an enrollment belongs to at most one
// certificate), which is enforced procedurally in the service layer.
export const certificateEnrollmentEnrollmentId = /^\d{1,10}$/;
