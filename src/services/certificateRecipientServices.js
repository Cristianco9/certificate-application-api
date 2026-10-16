import { CertificateRecipient } from '../db/models/certificateRecipient.js';
import { DocumentType } from '../db/models/documentType.js';
import { Certificate } from '../db/models/certificate.js';
import { Op } from 'sequelize';
import Boom from '@hapi/boom';

/**
 * Service for the CertificateRecipient (receptor_certificado) entity.
 * Handles CRUD, search, and referential guards. Read operations embed
 * the related DocumentType as a nested { id, name } object instead of
 * the raw foreign key.
 *
 * RE-REGISTRATION RULE
 * ────────────────────
 * The same physical person may return to the institution months or
 * years later to request a new certificate for a different student
 * (or the same student again after losing the original document).
 * `createOne` therefore behaves as an idempotent "upsert-by-identity":
 *
 *   1. Look up an existing recipient by `documentNumber` (UNIQUE).
 *   2. If none exists → insert a fresh record.
 *   3. If one exists, verify it belongs to the same person by comparing
 *      the CRITICAL fields:
 *        • firstName
 *        • lastName (first surname)
 *        • documentTypeId
 *        • documentNumber
 *        • relationship
 *      Text comparison is case- and diacritic-insensitive, so 'María'
 *      matches 'MARIA'.
 *   4. On match → update only `address` when it differs, and backfill
 *      `relationship` if the existing row predates the column (NULL
 *      wildcard). Everything else is preserved verbatim: the point of
 *      the rule is that the same person keeps their identity, only
 *      their contact information moves with them.
 *   5. On mismatch → reject with Boom.conflict so the operator can
 *      verify the input. Two records with the same documentNumber
 *      cannot coexist (UNIQUE) and silently overwriting the identity
 *      of a stored recipient would break historical integrity.
 */
export class CertificateRecipientServices {

  /**
   * Creates a new certificate recipient, or — if a record with the same
   * document number already exists and its critical fields match —
   * updates that record's address (and backfills a missing relationship).
   *
   * @param {Object} newCertificateRecipient
   * @param {string} newCertificateRecipient.firstName
   * @param {string} [newCertificateRecipient.middleName]
   * @param {string} newCertificateRecipient.lastName
   * @param {string} [newCertificateRecipient.secondLastName]
   * @param {number|string} newCertificateRecipient.documentTypeId
   * @param {string} newCertificateRecipient.documentNumber
   * @param {string} newCertificateRecipient.relationship
   * @param {string} newCertificateRecipient.address
   * @returns {Promise<{status: string}>}
   */
  async createOne(newCertificateRecipient) {
    try {
      const normalized = CertificateRecipientServices._normalizeData(newCertificateRecipient);

      await this._assertExists(DocumentType, normalized.documentTypeId, 'DocumentType');

      const existingByDocument = await this._findByDocumentNumber(normalized.documentNumber);

      if (existingByDocument) {
        // ── Same person? ──────────────────────────────────────────────
        const samePerson = CertificateRecipientServices._isSamePerson(
          existingByDocument,
          normalized
        );

        if (!samePerson) {
          throw Boom.conflict(
            'Ya existe un receptor del certificado con el mismo número de documento, ' +
            'pero sus datos de identificación no coinciden (nombre, primer apellido, ' +
            'tipo de documento o parentesco). Verifica la información ingresada.'
          );
        }

        // ── Same person — update address (and backfill relationship) ──
        const updateData = {};

        // Address — only touch it if the incoming value is present and
        // actually different, so we don't churn rows on a no-op submit.
        if (
          normalized.address !== undefined &&
          normalized.address !== null &&
          existingByDocument.address !== normalized.address
        ) {
          updateData.address = normalized.address;
        }

        // Legacy backfill — records created before the column existed
        // carry NULL and are upgraded on the first re-registration.
        if (
          (existingByDocument.relationship === null ||
            existingByDocument.relationship === undefined) &&
          normalized.relationship
        ) {
          updateData.relationship = normalized.relationship;
        }

        if (Object.keys(updateData).length > 0) {
          await CertificateRecipient.update(updateData, {
            where: { id: existingByDocument.id },
          });
        }

        return { status: 'UPDATED SUCCESSFULLY' };
      }

      // ── No existing record — insert a new one ────────────────────────
      await CertificateRecipient.create({
        firstName: normalized.firstName,
        middleName: normalized.middleName,
        lastName: normalized.lastName,
        secondLastName: normalized.secondLastName,
        documentTypeId: normalized.documentTypeId,
        documentNumber: normalized.documentNumber,
        relationship: normalized.relationship,
        address: normalized.address,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to create the certificate recipient in the database' });
    }
  }

  /**
   * Updates an existing certificate recipient.
   *
   * NOTE: this is a direct edit of a record identified by id — it does
   * NOT run the same-person check. That check belongs to `createOne`
   * and only exists to arbitrate the "already registered, coming back"
   * flow. Use this endpoint when an admin needs to correct a stored
   * record.
   *
   * @param {number|string} certificateRecipientId
   * @param {Object} newCertificateRecipientData
   * @returns {Promise<{status: string}>}
   */
  async updateOne(certificateRecipientId, newCertificateRecipientData) {
    if (!newCertificateRecipientData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      const existing = await this._findById(certificateRecipientId);
      if (!existing) {
        throw Boom.notFound('Certificate recipient not found');
      }

      const normalized = CertificateRecipientServices._normalizeData(newCertificateRecipientData);

      if (normalized.documentTypeId !== undefined) {
        await this._assertExists(DocumentType, normalized.documentTypeId, 'DocumentType');
      }

      if (normalized.documentNumber !== undefined) {
        const withSameDocument = await this._findByDocumentNumber(normalized.documentNumber);
        if (withSameDocument && withSameDocument.id !== Number(certificateRecipientId)) {
          throw Boom.conflict('Another certificate recipient already has that document number');
        }
      }

      const updateData = {};
      if (normalized.firstName !== undefined) updateData.firstName = normalized.firstName;
      if (normalized.middleName !== undefined) updateData.middleName = normalized.middleName;
      if (normalized.lastName !== undefined) updateData.lastName = normalized.lastName;
      if (normalized.secondLastName !== undefined) updateData.secondLastName = normalized.secondLastName;
      if (normalized.documentTypeId !== undefined) updateData.documentTypeId = normalized.documentTypeId;
      if (normalized.documentNumber !== undefined) updateData.documentNumber = normalized.documentNumber;
      if (normalized.relationship !== undefined) updateData.relationship = normalized.relationship;
      if (normalized.address !== undefined) updateData.address = normalized.address;

      const [updatedRows] = await CertificateRecipient.update(updateData, {
        where: { id: certificateRecipientId },
      });

      if (!updatedRows) {
        throw Boom.notFound('Certificate recipient not found');
      }

      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the certificate recipient in the database' });
    }
  }

  /**
   * Deletes a certificate recipient, provided no certificate references it.
   *
   * @param {number|string} certificateRecipientId
   * @returns {Promise<{status: string}>}
   */
  async deleteOne(certificateRecipientId) {
    if (!certificateRecipientId) {
      throw Boom.badRequest('No certificate recipient identifier was provided');
    }

    try {
      const existing = await this._findById(certificateRecipientId);
      if (!existing) {
        throw Boom.notFound('Certificate recipient not found');
      }

      // 'certificado' references this table with SET NULL, so without this
      // guard the recipient would be silently orphaned from any certificate.
      await this._assertNoAssociatedCertificates(certificateRecipientId);

      const deletedRows = await CertificateRecipient.destroy({
        where: { id: certificateRecipientId },
      });

      if (!deletedRows) {
        throw Boom.notFound('Certificate recipient not found');
      }

      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the certificate recipient from the database' });
    }
  }

  /**
   * Retrieves a single certificate recipient by id.
   *
   * @param {number|string} certificateRecipientId
   * @returns {Promise<Object>}
   */
  async listOne(certificateRecipientId) {
    if (!certificateRecipientId) {
      throw Boom.badRequest('No certificate recipient identifier was provided');
    }

    try {
      const theRecipient = await CertificateRecipient.findOne({
        where: { id: certificateRecipientId },
        include: CertificateRecipientServices.DOCUMENT_TYPE_INCLUDE,
      });

      if (!theRecipient) {
        throw Boom.notFound('Certificate recipient not found');
      }

      return CertificateRecipientServices._formatCertificateRecipient(theRecipient);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificate recipient' });
    }
  }

  /**
   * Retrieves all certificate recipients ordered by last name and first name.
   *
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listAll() {
    try {
      const allRecipients = await CertificateRecipient.findAll({
        order: [['id_receptor_certificado', 'ASC']],
        include: CertificateRecipientServices.DOCUMENT_TYPE_INCLUDE,
      });

      const records = allRecipients.map(CertificateRecipientServices._formatCertificateRecipient);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificate recipients' });
    }
  }

  /**
   * Searches certificate recipients whose first, middle, last, or second
   * last name partially matches the given text.
   *
   * @param {string} partialName
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listByPartialName(partialName) {
    if (!partialName) {
      throw Boom.badRequest('No search text was provided');
    }

    try {
      const matchingRecipients = await CertificateRecipient.findAll({
        where: {
          [Op.or]: [
            { firstName: { [Op.like]: `%${partialName}%` } },
            { middleName: { [Op.like]: `%${partialName}%` } },
            { lastName: { [Op.like]: `%${partialName}%` } },
            { secondLastName: { [Op.like]: `%${partialName}%` } },
          ],
        },
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
        include: CertificateRecipientServices.DOCUMENT_TYPE_INCLUDE,
      });

      const records = matchingRecipients.map(CertificateRecipientServices._formatCertificateRecipient);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to search the certificate recipients' });
    }
  }

  /**
   * Retrieves a certificate recipient by its exact document number.
   *
   * @param {string} documentNumber
   * @returns {Promise<Object>}
   */
  async listByDocumentNumber(documentNumber) {
    if (!documentNumber) {
      throw Boom.badRequest('No document number was provided');
    }

    try {
      const theRecipient = await CertificateRecipient.findOne({
        where: { documentNumber },
        include: CertificateRecipientServices.DOCUMENT_TYPE_INCLUDE,
      });

      if (!theRecipient) {
        throw Boom.notFound('Certificate recipient not found with the provided document number');
      }

      return CertificateRecipientServices._formatCertificateRecipient(theRecipient);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificate recipient by document number' });
    }
  }

  /**
   * Retrieves all certificate recipients matching a given document type.
   *
   * @param {number|string} documentTypeId
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listByDocumentType(documentTypeId) {
    if (!documentTypeId) {
      throw Boom.badRequest('No document type identifier was provided');
    }

    try {
      const recipients = await CertificateRecipient.findAll({
        where: { documentTypeId },
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
        include: CertificateRecipientServices.DOCUMENT_TYPE_INCLUDE,
      });

      const records = recipients.map(CertificateRecipientServices._formatCertificateRecipient);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find certificate recipients for the given document type' });
    }
  }

  // Private helpers

  async _findById(certificateRecipientId) {
    return CertificateRecipient.findOne({ where: { id: certificateRecipientId } });
  }

  async _findByDocumentNumber(documentNumber) {
    return CertificateRecipient.findOne({ where: { documentNumber } });
  }

  async _assertNoAssociatedCertificates(certificateRecipientId) {
    const associated = await Certificate.findOne({ where: { recipientId: certificateRecipientId } });
    if (associated) {
      throw Boom.conflict('The certificate recipient cannot be deleted because it has associated certificates');
    }
  }

  async _assertExists(model, id, name) {
    const record = await model.findOne({ where: { id } });
    if (!record) {
      throw Boom.notFound(`${name} with id ${id} does not exist`);
    }
  }

  // Static utilities

  static DOCUMENT_TYPE_INCLUDE = [
    { model: DocumentType, as: 'documentType', attributes: ['id', 'name'] },
  ];

  static _formatCertificateRecipient(recipient) {
    const { documentTypeId, documentType, ...rest } = recipient.toJSON();
    return {
      ...rest,
      documentType: documentType ?? null,
    };
  }

  static _normalizeData(data) {
    const normalized = {};

    const normalizeString = (value) => {
      if (value === undefined || value === null) return undefined;
      return String(value).trim();
    };

    const normalizeId = (value) => {
      if (value === undefined || value === null || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    };

    if (data.firstName !== undefined) normalized.firstName = normalizeString(data.firstName);
    if (data.middleName !== undefined) normalized.middleName = normalizeString(data.middleName);
    if (data.lastName !== undefined) normalized.lastName = normalizeString(data.lastName);
    if (data.secondLastName !== undefined) normalized.secondLastName = normalizeString(data.secondLastName);
    if (data.documentNumber !== undefined) normalized.documentNumber = normalizeString(data.documentNumber);
    if (data.relationship !== undefined) normalized.relationship = normalizeString(data.relationship);
    if (data.address !== undefined) normalized.address = normalizeString(data.address);
    if (data.documentTypeId !== undefined) normalized.documentTypeId = normalizeId(data.documentTypeId);

    return normalized;
  }

  /**
   * Case-insensitive, diacritic-insensitive comparison for the text
   * fields used by the same-person check. 'María' matches 'MARIA',
   * 'Pérez' matches 'perez'. Nullish values normalize to '' so a
   * missing field on either side is a clean comparison instead of
   * throwing.
   *
   * @private
   * @static
   */
  static _normalizeForComparison(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Decides whether an existing recipient and the incoming payload
   * describe the SAME person, based on the five critical fields:
   * firstName, lastName, documentTypeId, documentNumber, relationship.
   *
   * Text fields are compared with `_normalizeForComparison` so casing
   * and accents don't force a false mismatch. The `relationship` field
   * is nullable on the existing side (legacy rows created before the
   * column existed): a NULL is treated as a wildcard, letting the same
   * person's record be upgraded on the next re-registration without
   * forcing the operator to invent data.
   *
   * @private
   * @static
   * @param {CertificateRecipient} existing
   * @param {Object} incoming - The normalized incoming payload.
   * @returns {boolean}
   */
  static _isSamePerson(existing, incoming) {
    const norm = CertificateRecipientServices._normalizeForComparison;

    // firstName
    if (norm(existing.firstName) !== norm(incoming.firstName)) return false;

    // lastName (first surname) — 'apellidos_receptor_certificado'
    if (norm(existing.lastName) !== norm(incoming.lastName)) return false;

    // documentTypeId — numeric equality
    if (Number(existing.documentTypeId) !== Number(incoming.documentTypeId)) return false;

    // documentNumber
    if (norm(existing.documentNumber) !== norm(incoming.documentNumber)) return false;

    // relationship — NULL on the existing side is a wildcard; otherwise
    // an exact match is required.
    const existingRelationship = existing.relationship;
    const incomingRelationship = incoming.relationship;

    const existingHasRelationship =
      existingRelationship !== null && existingRelationship !== undefined;

    if (existingHasRelationship && incomingRelationship !== undefined && incomingRelationship !== null) {
      if (existingRelationship !== incomingRelationship) return false;
    }

    return true;
  }
}
