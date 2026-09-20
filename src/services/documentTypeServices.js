// Import the DocumentType data model
import { DocumentType } from '../db/models/documentType.js';
// Import the models that reference DocumentType, needed to enforce the delete-guard business rules
import { User } from '../db/models/user.js';
import { CertificateRecipient } from '../db/models/certificateRecipient.js';
import { Student } from '../db/models/student.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the DocumentType (tipo_documento) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * 'name' is backed by a fixed MySQL ENUM column (see
 * migrations/20260707181130-documentType.cjs), so this service
 * validates incoming values against the same closed set before hitting
 * the database, giving a clearer Boom error than the raw ENUM rejection
 * MySQL would otherwise throw.
 *
 * This is one of the most widely referenced catalog entities in the
 * domain: 'usuario' and 'receptor_certificado' point to it with
 * onDelete: 'RESTRICT' (hard constraints), while 'estudiante' points to
 * it with onDelete: 'SET NULL' (soft, since historical students may
 * lack a registered document type). The deletion guard below checks
 * all three.
 */
export class DocumentTypeServices {

  // ==========================================================
  // PUBLIC METHODS (instance)
  // ==========================================================

  /**
   * Creates a new document type record in the database.
   *
   * @param {Object} newDocumentType
   * @param {string} newDocumentType.name
   * @returns {Promise<{status: string}>}
   */
  async createOne(newDocumentType) {

    try {

      // Validate the name against the closed ENUM set before querying
      DocumentTypeServices._assertValidName(newDocumentType.name);

      // Verify a document type with the same name does not already exist
      const existingDocumentType = await this._findByName(newDocumentType.name);

      if (existingDocumentType) {
        throw Boom.conflict('A document type already exists with the provided name');
      }

      // Create the record (id is generated automatically)
      await DocumentType.create({
        name: newDocumentType.name,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the document type in the database'
      });
    }
  }

  /**
   * Updates an existing document type record.
   *
   * @param {number} documentTypeId - The id of the document type to update.
   * @param {Object} newDocumentTypeData - The new data to persist.
   * @param {string} newDocumentTypeData.name - The new document type name.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async updateOne(documentTypeId, newDocumentTypeData) {

    if (!newDocumentTypeData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the document type exists before attempting the update
      const existingDocumentType = await this._findById(documentTypeId);

      if (!existingDocumentType) {
        throw Boom.notFound('Document type not found');
      }

      // If a new name is provided, validate it and verify it is not
      // already used by another document type
      if (newDocumentTypeData.name) {
        DocumentTypeServices._assertValidName(newDocumentTypeData.name);

        const documentTypeWithSameName = await this._findByName(newDocumentTypeData.name);

        if (documentTypeWithSameName && documentTypeWithSameName.id !== documentTypeId) {
          throw Boom.conflict('Another document type is already registered with that name');
        }
      }

      // Update the record in the database
      const [updatedRows] = await DocumentType.update(
        {
          name: newDocumentTypeData.name,
        },
        {
          where: { id: documentTypeId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Document type not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the document type in the database' });
    }
  }

  /**
   * Deletes a document type record, provided it has no associated
   * users, certificate recipients, or students.
   *
   * @param {number} documentTypeId - The id of the document type to delete.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async deleteOne(documentTypeId) {

    if (!documentTypeId) {
      throw Boom.badRequest('No document type identifier was provided');
    }

    try {
      // Verify the document type exists before attempting the deletion
      const existingDocumentType = await this._findById(documentTypeId);

      if (!existingDocumentType) {
        throw Boom.notFound('Document type not found');
      }

      // Prevent deletion if the document type still has associated
      // users or certificate recipients, giving a clearer error than
      // the raw RESTRICT constraint from MySQL
      await this._assertNoAssociatedUsers(documentTypeId);
      await this._assertNoAssociatedCertificateRecipients(documentTypeId);

      // Also prevent deletion if it still has associated students. This
      // is a business-rule guard rather than a hard database constraint,
      // since 'estudiante' references 'tipo_documento' with SET NULL.
      await this._assertNoAssociatedStudents(documentTypeId);

      // Destroy the record in the database
      const deletedRows = await DocumentType.destroy({
        where: { id: documentTypeId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Document type not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the document type from the database' });
    }
  }

  /**
   * Retrieves a single document type by its id.
   *
   * @param {number} documentTypeId - The id of the document type to retrieve.
   * @returns {Promise<DocumentType>} - The document type record.
   */
  async listOne(documentTypeId) {

    if (!documentTypeId) {
      throw Boom.badRequest('No document type identifier was provided');
    }

    try {
      const theDocumentType = await this._findById(documentTypeId);

      if (!theDocumentType) {
        throw Boom.notFound('Document type not found');
      }

      return theDocumentType;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the document type' });
    }
  }

  /**
   * Retrieves all document type records, ordered alphabetically by name.
   *
   * @returns {Promise<{total: number, records: DocumentType[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allDocumentTypes = await DocumentType.findAll({
        order: [['name', 'ASC']]
      });

      return { total: allDocumentTypes.length, records: allDocumentTypes };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the document types' });
    }
  }

  /**
   * Retrieves a single document type by its exact name. Since 'name' is
   * backed by a fixed ENUM (a closed, small set of values), an exact
   * lookup is more meaningful here than a partial-text search.
   *
   * @param {string} name - The document type name to search for.
   * @returns {Promise<DocumentType>} - The matching document type record.
   */
  async listByName(name) {

    if (!name) {
      throw Boom.badRequest('No document type name was provided');
    }

    try {
      const theDocumentType = await this._findByName(name);

      if (!theDocumentType) {
        throw Boom.notFound('Document type not found with the provided name');
      }

      return theDocumentType;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the document type by its name' });
    }
  }

  // ==========================================================
  // PRIVATE HELPERS (instance)
  // Naming convention: a leading underscore marks a method as
  // internal to this class and not meant to be called from
  // controllers. True '#private' class fields are intentionally
  // avoided to stay compatible with the ecmaVersion 12 (ES2021)
  // parser target declared in .eslintrc.json.
  // ==========================================================

  /**
   * Finds a document type by its primary key.
   *
   * @private
   * @param {number} documentTypeId - The id of the document type to find.
   * @returns {Promise<DocumentType|null>} - The document type record, or null if not found.
   */
  async _findById(documentTypeId) {
    return DocumentType.findOne({ where: { id: documentTypeId } });
  }

  /**
   * Finds a document type by its exact name.
   *
   * @private
   * @param {string} name - The document type name to find.
   * @returns {Promise<DocumentType|null>} - The document type record, or null if not found.
   */
  async _findByName(name) {
    return DocumentType.findOne({ where: { name } });
  }

  /**
   * Ensures a document type has no associated users before allowing
   * its deletion, since 'usuario' references 'tipo_documento' with
   * onDelete: 'RESTRICT' at the database level.
   *
   * @private
   * @param {number} documentTypeId - The id of the document type to check.
   * @throws {Boom} - A conflict error when dependent users exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedUsers(documentTypeId) {
    const associatedUser = await User.findOne({
      where: { documentTypeId }
    });

    if (associatedUser) {
      throw Boom.conflict('The document type cannot be deleted because it has associated users');
    }
  }

  /**
   * Ensures a document type has no associated certificate recipients
   * before allowing its deletion, since 'receptor_certificado'
   * references 'tipo_documento' with onDelete: 'RESTRICT' at the
   * database level.
   *
   * @private
   * @param {number} documentTypeId - The id of the document type to check.
   * @throws {Boom} - A conflict error when dependent certificate recipients exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedCertificateRecipients(documentTypeId) {
    const associatedRecipient = await CertificateRecipient.findOne({
      where: { documentTypeId }
    });

    if (associatedRecipient) {
      throw Boom.conflict('The document type cannot be deleted because it has associated certificate recipients');
    }
  }

  /**
   * Ensures a document type has no associated students before allowing
   * its deletion. This is a business-rule guard rather than a hard
   * database constraint, since 'estudiante' references 'tipo_documento'
   * with onDelete: 'SET NULL'.
   *
   * @private
   * @param {number} documentTypeId - The id of the document type to check.
   * @throws {Boom} - A conflict error when dependent students exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedStudents(documentTypeId) {
    const associatedStudent = await Student.findOne({
      where: { documentTypeId }
    });

    if (associatedStudent) {
      throw Boom.conflict('The document type cannot be deleted because it has associated students');
    }
  }

  // ==========================================================
  // STATIC UTILITIES
  // Stateless helpers that do not depend on instance data, and are
  // therefore exposed as static methods. The ones prefixed with '_'
  // are intended strictly for internal use within this class (mirroring
  // the instance-method privacy convention), since ecmaVersion 12
  // (ES2021) does not support true private static members without
  // '#' fields.
  // ==========================================================

  /**
   * The closed set of document type names allowed by the
   * 'nombre_tipodocumento' ENUM column.
   *
   * @static
   * @type {string[]}
   */
  static VALID_NAMES = [
    'Cédula de Ciudadanía',
    'Tarjeta de Identidad',
    'Registro Civil',
    'Cédula de Extranjería',
    'Pasaporte',
    'Permiso Especial de Permanencia (PEP)',
    'NIT',
  ];

  /**
   * Validates that a name belongs to the closed set of document type
   * names, throwing a clear Boom error before the query ever reaches
   * the database.
   *
   * @private
   * @static
   * @param {string} name - The document type name to validate.
   * @throws {Boom} - A bad request error when the name is not allowed.
   * @returns {void}
   */
  static _assertValidName(name) {
    if (!DocumentTypeServices.VALID_NAMES.includes(name)) {
      throw Boom.badRequest(`The document type name must be one of: ${DocumentTypeServices.VALID_NAMES.join(', ')}`);
    }
  }
}
