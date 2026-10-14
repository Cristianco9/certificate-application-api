// The pattern ensures the role name matches exactly one of the 5 fixed
// values used by the institution: 'Máster', 'Auxiliar',
// 'Administrador', 'Secretario', 'Rector'. Unlike a character-range
// pattern, this is an exact literal alternation, since the field
// represents a closed set of institutional roles rather than
// free-form text. Matches the VARCHAR(50) column size defined in
// rol.nombre_rol
export const roleName = /^(Máster|Auxiliar|Administrador|Secretario|Rector)$/;

// The pattern ensures the role description contains letters
// (both uppercase and lowercase, including Spanish accented characters
// and 'ñ', via the Unicode letter category \p{L}),
// digits, spaces, and basic punctuation (. , -) to allow a short
// grammatically correct sentence,
// and is between 3 to 70 characters long, matching the
// VARCHAR(50) column size defined in rol.descripcion_rol
export const roleDescription = /^[\p{L}\d .,-]{3,70}$/u;

// The pattern ensures the role id contains only numbers
// and is between 1 to 10 digits long, matching the INTEGER primary key
// defined in rol.id_rol
export const roleId = /^\d{1,10}$/;
