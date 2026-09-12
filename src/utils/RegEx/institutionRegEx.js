// The pattern ensures the institution name contains letters
// (both uppercase and lowercase, including Spanish accented characters
// and 'ñ', via the Unicode letter category \p{L}), digits, and spaces
// (to allow values such as 'Liceo Femenino Nuestra Señora de
// Chiquinquirá'),
// and is between 3 to 50 characters long, matching the
// VARCHAR(50) column size defined in institucion.nombre_institucion
export const institutionName = /^[\p{L}\d ]{3,100}$/u;

// The pattern ensures the institutional code (DANE code, assigned by the
// Ministry of Education) accepts uppercase letters and digits only,
// no spaces or symbols,
// and is between 3 to 50 characters long, matching the
// VARCHAR(50) column size defined in institucion.codigo_institucional
export const institutionalCode = /^[A-Z0-9]{3,50}$/;

// The pattern ensures the institution address contains letters
// (both uppercase and lowercase, including Spanish accented characters
// and 'ñ', via the Unicode letter category \p{L}),
// digits, spaces, and the symbols (# - ,) commonly used in Colombian
// address formats,
// and is between 5 to 200 characters long, matching the
// VARCHAR(200) column size defined in institucion.direccion_institucion
export const institutionAddress = /^[\p{L}\d #,-]{5,200}$/u;

// The pattern ensures the institution email contains only letters
// (both uppercase and lowercase),
// numbers (between 0 and 9),
// special characters as (._%+-),
// and email domain *@*.*, matching the
// VARCHAR(254) column size defined in institucion.email_institucion
export const institutionEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]{3,}\.[a-zA-Z]{2,}$/;

// The pattern ensures the NIT (Colombian tax ID) contains a base number
// of 9 to 10 digits, followed by a hyphen and a single check digit
// (e.g. '900123456-7'), matching the
// VARCHAR(20) column size defined in institucion.nit_institucion
export const institutionNitId = /^\d{9,10}-\d{1}$/;

// The pattern ensures the institution id contains only numbers
// and is between 1 to 10 digits long, matching the INTEGER primary key
// defined in institucion.id_institucion
export const institutionId = /^\d{1,10}$/;

// The pattern ensures the foreign key to Municipio contains only numbers
// and is between 1 to 10 digits long, matching the INTEGER foreign key
// defined in institucion.id_municipio_institucion.
// This field is nullable at the database level, so the schema layer
// (Joi) is responsible for allowing an empty value where applicable.
export const institutionMunicipalityId = /^\d{1,10}$/;
