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
 */
export class CertificateRecipientServices {

  /**
   * Creates a new certificate recipient.
   *
   * @param {Object} newCertificateRecipient
   * @param {string} newCertificateRecipient.firstName
   * @param {string} newCertificateRecipient.lastName
   * @param {number|string} newCertificateRecipient.documentTypeId
   * @param {string} newCertificateRecipient.documentNumber
   * @param {string} newCertificateRecipient.address
   * @returns {Promise<{status: string}>}
   */
  async createOne(newCertificateRecipient) {
    try {
      const normalized = CertificateRecipientServices._normalizeData(newCertificateRecipient);

      await this._assertExists(DocumentType, normalized.documentTypeId, 'DocumentType');

      const existingByDocument = await this._findByDocumentNumber(normalized.documentNumber);
      if (existingByDocument) {
        throw Boom.conflict('A certificate recipient with the provided document number already exists');
      }

      await CertificateRecipient.create({
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        documentTypeId: normalized.documentTypeId,
        documentNumber: normalized.documentNumber,
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
      if (normalized.lastName !== undefined) updateData.lastName = normalized.lastName;
      if (normalized.documentTypeId !== undefined) updateData.documentTypeId = normalized.documentTypeId;
      if (normalized.documentNumber !== undefined) updateData.documentNumber = normalized.documentNumber;
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
   * @returns {Promise<Object[]>}
   */
  async listAll() {
    try {
      const allRecipients = await CertificateRecipient.findAll({
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
        include: CertificateRecipientServices.DOCUMENT_TYPE_INCLUDE,
      });

      return allRecipients.map(CertificateRecipientServices._formatCertificateRecipient);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificate recipients' });
    }
  }

  /**
   * Searches certificate recipients whose first or last name partially
   * matches the given text.
   *
   * @param {string} partialName
   * @returns {Promise<Object[]>}
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
            { lastName: { [Op.like]: `%${partialName}%` } },
          ],
        },
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
        include: CertificateRecipientServices.DOCUMENT_TYPE_INCLUDE,
      });

      return matchingRecipients.map(CertificateRecipientServices._formatCertificateRecipient);

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
   * @returns {Promise<Object[]>}
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

      return recipients.map(CertificateRecipientServices._formatCertificateRecipient);

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
    if (data.lastName !== undefined) normalized.lastName = normalizeString(data.lastName);
    if (data.documentNumber !== undefined) normalized.documentNumber = normalizeString(data.documentNumber);
    if (data.address !== undefined) normalized.address = normalizeString(data.address);
    if (data.documentTypeId !== undefined) normalized.documentTypeId = normalizeId(data.documentTypeId);

    return normalized;
  }
}
