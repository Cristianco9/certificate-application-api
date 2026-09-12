// The pattern ensures the recipient first name contains only letters
// (both uppercase and lowercase, including Spanish accented characters
// and 'ñ', via the Unicode letter category \p{L}),
// with no spaces (a single given name),
// and is between 3 to 50 characters long, matching the
// VARCHAR(50) column size defined in
// receptor_certificado.nombre_receptor_certificado
export const certificateRecipientFirstName = /^[\p{L}]{3,50}$/u;
// The pattern ensures the recipient middle name, when provided,
// contains only letters (both uppercase and lowercase, including
// Spanish accented characters and 'ñ', via the Unicode letter
// category \p{L}), with no spaces (a single given name), and is
// between 3 to 50 characters long. This field is OPTIONAL: an empty
// string is also accepted, since not every recipient has a middle
// name, matching the VARCHAR(50) column size defined in
// receptor_certificado.segundo_nombre_receptor_certificado
export const certificateRecipientMiddleName = /^([\p{L}]{3,50})?$/u;

// The pattern ensures the recipient last name contains only letters
// (both uppercase and lowercase, including Spanish accented characters
// and 'ñ', via the Unicode letter category \p{L}),
// with no spaces (a single surname),
// and is between 3 to 50 characters long, matching the
// VARCHAR(50) column size defined in
// receptor_certificado.apellidos_receptor_certificado
export const certificateRecipientLastName = /^[\p{L}]{3,50}$/u;

// The pattern ensures the recipient second last name, when provided,
// contains only letters (both uppercase and lowercase, including
// Spanish accented characters and 'ñ', via the Unicode letter
// category \p{L}), with no spaces (a single surname), and is
// between 3 to 50 characters long. This field is OPTIONAL: an empty
// string is also accepted, since not every recipient has a second
// last name, matching the VARCHAR(50) column size defined in
// receptor_certificado.segundo_apellido_receptor_certificado
export const certificateRecipientSecondLastName = /^([\p{L}]{3,50})?$/u;

// The pattern ensures the recipient document number accepts either:
// - a purely numeric Colombian national ID (cédula), 6 to 10 digits, or
// - an alphanumeric foreign document such as a passport (6 to 20
//   characters, letters and digits only, no spaces or symbols)
// matching the VARCHAR(20) column size defined in
// receptor_certificado.identificacion_receptor_certificado
export const certificateRecipientDocumentNumber = /^(\d{6,10}|[a-zA-Z0-9]{6,20})$/;

// The pattern ensures the recipient address contains letters
// (both uppercase and lowercase, including Spanish accented characters
// and 'ñ', via the Unicode letter category \p{L}),
// digits, spaces, and the symbols (# - ,) commonly used in Colombian
// address formats,
// and is between 5 to 120 characters long, matching the
// VARCHAR(120) column size defined in
// receptor_certificado.direccion_receptor_certificado
export const certificateRecipientAddress = /^[\p{L}\d #,-]{5,120}$/u;

// The pattern ensures the certificate recipient id contains only
// numbers and is between 1 to 10 digits long, matching the INTEGER
// primary key defined in
// receptor_certificado.id_receptor_certificado
export const certificateRecipientId = /^\d{1,10}$/;

// The pattern ensures the foreign key to TipoDocumento contains only
// numbers and is between 1 to 10 digits long, matching the INTEGER
// foreign key defined in
// receptor_certificado.id_tipodocumento_receptor_certificado
export const certificateRecipientDocumentTypeId = /^\d{1,10}$/;
