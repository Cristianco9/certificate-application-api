import Joi from 'joi';

import {
  certificateRecipientId,
  certificateRecipientFirstName,
  certificateRecipientMiddleName,
  certificateRecipientLastName,
  certificateRecipientSecondLastName,
  certificateRecipientDocumentNumber,
  certificateRecipientAddress,
  certificateRecipientDocumentTypeId,
} from '../utils/RegEx/certificateRecipientRegEx.js';

const joiId = Joi.string().pattern(certificateRecipientId).messages({
  'string.base': 'El id debe ser una cadena de texto.',
  'string.pattern.base': 'El id debe contener solo dígitos (1 a 10 dígitos).',
});

const joiFirstName = Joi.string().pattern(certificateRecipientFirstName).messages({
  'string.base': 'El nombre del receptor debe ser una cadena de texto.',
  'string.pattern.base': 'El nombre del receptor debe tener entre 3 y 50 caracteres y contener solo letras.',
});

// Optional: empty string is allowed when the recipient has no middle name
const joiMiddleName = Joi.string().pattern(certificateRecipientMiddleName).allow('').messages({
  'string.base': 'El segundo nombre del receptor debe ser una cadena de texto.',
  'string.pattern.base': 'El segundo nombre del receptor debe tener entre 3 y 50 caracteres y contener solo letras y espacios, o estar vacío.',
});

const joiLastName = Joi.string().pattern(certificateRecipientLastName).messages({
  'string.base': 'Los apellidos del receptor deben ser una cadena de texto.',
  'string.pattern.base': 'Los apellidos del receptor deben tener entre 3 y 50 caracteres y contener solo letras.',
});


// Optional: empty string is allowed when the recipient has no second last name
const joiSecondLastName = Joi.string().pattern(certificateRecipientSecondLastName).allow('').messages({
  'string.base': 'El segundo apellido del receptor debe ser una cadena de texto.',
  'string.pattern.base': 'El segundo apellido del receptor debe tener entre 3 y 50 caracteres y contener solo letras y espacios, o estar vacío.',
});

const joiDocumentNumber = Joi.string().pattern(certificateRecipientDocumentNumber).messages({
  'string.base': 'El número de documento debe ser una cadena de texto.',
  'string.pattern.base': 'El número de documento debe tener entre 6 y 10 dígitos (cédula) o entre 6 y 20 caracteres alfanuméricos (pasaporte).',
});

const joiAddress = Joi.string().pattern(certificateRecipientAddress).messages({
  'string.base': 'La dirección debe ser una cadena de texto.',
  'string.pattern.base': 'La dirección debe tener entre 5 y 120 caracteres y contener solo letras, números, espacios y los símbolos # - ,',
});

const joiDocumentTypeId = Joi.string().pattern(certificateRecipientDocumentTypeId).messages({
  'string.base': 'El id del tipo de documento debe ser una cadena de texto.',
  'string.pattern.base': 'El id del tipo de documento debe contener solo dígitos (1 a 10 dígitos).',
});

export const certificateRecipientSchema = {

  // POST /get-by-id (body: { id })
  getCertificateRecipientById: Joi.object({
    id: joiId.required(),
  }),

  // POST /search-by-name (body: { partialName })
  searchCertificateRecipientsByName: Joi.object({
    partialName: joiFirstName.required(),
  }),

  // POST /get-by-document-number (body: { documentNumber })
  getCertificateRecipientByDocumentNumber: Joi.object({
    documentNumber: joiDocumentNumber.required(),
  }),

  // POST /get-by-document-type (body: { documentTypeId })
  listCertificateRecipientsByDocumentType: Joi.object({
    documentTypeId: joiDocumentTypeId.required(),
  }),

  // POST /create (body: { firstName, middleName?, lastName, secondLastName?, documentTypeId, documentNumber, address })
  newCertificateRecipientData: Joi.object({
    firstName: joiFirstName.required(),
    middleName: joiMiddleName.optional(),
    lastName: joiLastName.required(),
    secondLastName: joiSecondLastName.optional(),
    documentTypeId: joiDocumentTypeId.required(),
    documentNumber: joiDocumentNumber.required(),
    address: joiAddress.required(),
  }),

  // PATCH /update (body: { id, firstName?, middleName?, lastName?, secondLastName?, documentTypeId?, documentNumber?, address? })
  updateCertificateRecipientData: Joi.object({
    id: joiId.required(),
    firstName: joiFirstName,
    middleName: joiMiddleName,
    lastName: joiLastName,
    secondLastName: joiSecondLastName,
    documentTypeId: joiDocumentTypeId,
    documentNumber: joiDocumentNumber,
    address: joiAddress,
  }).or('firstName', 'middleName', 'lastName', 'secondLastName', 'documentTypeId', 'documentNumber', 'address').messages({
    'object.missing': 'Debe proporcionar al menos un campo para actualizar el receptor del certificado.',
  }),

  // DELETE /delete (body: { id })
  deleteCertificateRecipient: Joi.object({
    id: joiId.required(),
  }),

};
