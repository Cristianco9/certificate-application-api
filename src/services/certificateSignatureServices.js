// Import the CertificateSignature data model
import { CertificateSignature } from '../db/models/certificateSignature.js';
// Import related models to embed FK data as nested objects and to verify
// referential integrity before writing
import { User } from '../db/models/user.js';
import { Certificate } from '../db/models/certificate.js';
import { Municipality } from '../db/models/municipality.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the CertificateSignature
 * (firma_certificado) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * A CertificateSignature binds a signer (User) to a Certificate and to
 * the Municipality where the signature is executed. Two business rules
 * shape this service:
 *
 *   1. 'firma_certificado.id_usuario_firmacertificado' is UNIQUE — a
 *      given User can only ever be registered as a signer once. That is
 *      why the by-signer lookup is a singular getBySigner rather than a
 *      listBySigner, and why 'userId' is intentionally NOT part of the
 *      update payload: re-pointing a signature at a different user is
 *      semantically a delete + create, not an in-place update.
 *
 *   2. A Certificate can carry MANY signatures (Rector + Secretario,
 *      etc.), which is why listByCertificate returns a collection.
 *
 * No table references 'firma_certificado' as a foreign key, so deleteOne
 * requires no associated-records guard.
 *
 * Every method that returns a CertificateSignature record embeds its
 * related signer, certificate, and municipality as nested objects,
 * rather than exposing the raw foreign key integers.
 */
export class CertificateSignatureServices {

  // ==========================================================
  // PUBLIC METHODS (instance)
  // ==========================================================

  /**
   * Creates a new certificate signature record, binding a signer to a
   * certificate in a given municipality.
   *
   * @param {Object} newCertificateSignature
   * @param {number|string} newCertificateSignature.userId
   * @param {number|string} newCertificateSignature.certificateId
   * @param {number|string} newCertificateSignature.municipalityId
   * @returns {Promise<{status: string}>}
   */
  async createOne(newCertificateSignature) {

    try {
      // Verify the referenced signer, certificate, and municipality
      // actually exist before linking them
      await this._assertExists(User, newCertificateSignature.userId, 'User');
      await this._assertExists(Certificate, newCertificateSignature.certificateId, 'Certificate');
      await this._assertExists(Municipality, newCertificateSignature.municipalityId, 'Municipality');

      // Enforce the UNIQUE constraint on id_usuario_firmacertificado at
      // the service layer, so a duplicate signer registration surfaces a
      // clear Boom.conflict instead of the raw ORM unique-constraint error
      const existingSignatureForUser = await this._findBySigner(newCertificateSignature.userId);

      if (existingSignatureForUser) {
        throw Boom.conflict('The user is already registered as a certificate signer');
      }

      // Verify this exact (signer, certificate) pair does not already exist
      const existingSignatureForCertificate = await this._findByCertificateAndSigner(
        newCertificateSignature.certificateId,
        newCertificateSignature.userId
      );

      if (existingSignatureForCertificate) {
        throw Boom.conflict('The user has already signed the provided certificate');
      }

      // Create the record (id is generated automatically)
      await CertificateSignature.create({
        userId: newCertificateSignature.userId,
        certificateId: newCertificateSignature.certificateId,
        municipalityId: newCertificateSignature.municipalityId,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the certificate signature in the database'
      });
    }
  }

  /**
   * Updates an existing certificate signature record. 'userId' is
   * intentionally NOT updatable: reassigning a signature to a different
   * signer is semantically a delete + create, given the UNIQUE
   * constraint on the signer column.
   *
   * @param {number|string} certificateSignatureId
   * @param {Object} newCertificateSignatureData
   * @param {number|string} [newCertificateSignatureData.certificateId]
   * @param {number|string} [newCertificateSignatureData.municipalityId]
   * @returns {Promise<{status: string}>}
   */
  async updateOne(certificateSignatureId, newCertificateSignatureData) {

    if (!newCertificateSignatureData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the signature exists before attempting the update
      const existingSignature = await this._findById(certificateSignatureId);

      if (!existingSignature) {
        throw Boom.notFound('Certificate signature not found');
      }

      // If a new certificate is provided, verify it actually exists
      if (newCertificateSignatureData.certificateId) {
        await this._assertExists(Certificate, newCertificateSignatureData.certificateId, 'Certificate');
      }

      // If a new municipality is provided, verify it actually exists
      if (newCertificateSignatureData.municipalityId) {
        await this._assertExists(Municipality, newCertificateSignatureData.municipalityId, 'Municipality');
      }

      // If the certificate changes, verify the signer has not already
      // signed that other certificate (would break the (certificate, user)
      // business uniqueness)
      if (newCertificateSignatureData.certificateId) {
        const conflictingSignature = await this._findByCertificateAndSigner(
          newCertificateSignatureData.certificateId,
          existingSignature.userId
        );

        if (conflictingSignature && conflictingSignature.id !== Number(certificateSignatureId)) {
          throw Boom.conflict('The signer has already signed the provided certificate');
        }
      }

      // Build the update object dynamically so omitted fields are not
      // overwritten
      const updateData = {};

      if (newCertificateSignatureData.certificateId !== undefined) {
        updateData.certificateId = newCertificateSignatureData.certificateId;
      }

      if (newCertificateSignatureData.municipalityId !== undefined) {
        updateData.municipalityId = newCertificateSignatureData.municipalityId;
      }

      const [updatedRows] = await CertificateSignature.update(updateData, {
        where: { id: certificateSignatureId }
      });

      if (!updatedRows) {
        throw Boom.notFound('Certificate signature not found');
      }

      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the certificate signature in the database' });
    }
  }

  /**
   * Deletes a certificate signature record. No other table references
   * 'firma_certificado' as a foreign key, so no associated-records guard
   * is required here.
   *
   * @param {number|string} certificateSignatureId
   * @returns {Promise<{status: string}>}
   */
  async deleteOne(certificateSignatureId) {

    if (!certificateSignatureId) {
      throw Boom.badRequest('No certificate signature identifier was provided');
    }

    try {
      const existingSignature = await this._findById(certificateSignatureId);

      if (!existingSignature) {
        throw Boom.notFound('Certificate signature not found');
      }

      const deletedRows = await CertificateSignature.destroy({
        where: { id: certificateSignatureId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Certificate signature not found');
      }

      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the certificate signature from the database' });
    }
  }

  /**
   * Retrieves a single certificate signature by its id, embedding its
   * related signer, certificate, and municipality as nested objects.
   *
   * @param {number|string} certificateSignatureId
   * @returns {Promise<Object>}
   */
  async listOne(certificateSignatureId) {

    if (!certificateSignatureId) {
      throw Boom.badRequest('No certificate signature identifier was provided');
    }

    try {
      const theSignature = await CertificateSignature.findOne({
        where: { id: certificateSignatureId },
        include: CertificateSignatureServices.CATALOG_INCLUDES,
      });

      if (!theSignature) {
        throw Boom.notFound('Certificate signature not found');
      }

      return CertificateSignatureServices._formatCertificateSignature(theSignature);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificate signature' });
    }
  }

  /**
   * Retrieves all certificate signature records, ordered by id
   * ascending, each with its related signer, certificate, and
   * municipality embedded as nested objects.
   *
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allSignatures = await CertificateSignature.findAll({
        order: [['id', 'ASC']],
        include: CertificateSignatureServices.CATALOG_INCLUDES,
      });

      const records = allSignatures.map(CertificateSignatureServices._formatCertificateSignature);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificate signatures' });
    }
  }

  /**
   * Retrieves every signature attached to a given certificate, ordered
   * by id ascending, each with its related signer and municipality
   * embedded as nested objects. Used to render the signature block of
   * a certificate document.
   *
   * @param {number|string} certificateId
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listByCertificate(certificateId) {

    if (!certificateId) {
      throw Boom.badRequest('No certificate identifier was provided');
    }

    try {
      const signaturesByCertificate = await CertificateSignature.findAll({
        where: { certificateId },
        order: [['id', 'ASC']],
        include: CertificateSignatureServices.CATALOG_INCLUDES,
      });

      const records = signaturesByCertificate.map(CertificateSignatureServices._formatCertificateSignature);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the signatures for the given certificate' });
    }
  }

  /**
   * Retrieves every signature executed in a given municipality, ordered
   * by id ascending, each with its related signer and certificate
   * embedded as nested objects.
   *
   * @param {number|string} municipalityId
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listByMunicipality(municipalityId) {

    if (!municipalityId) {
      throw Boom.badRequest('No municipality identifier was provided');
    }

    try {
      const signaturesByMunicipality = await CertificateSignature.findAll({
        where: { municipalityId },
        order: [['id', 'ASC']],
        include: CertificateSignatureServices.CATALOG_INCLUDES,
      });

      const records = signaturesByMunicipality.map(CertificateSignatureServices._formatCertificateSignature);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the signatures for the given municipality' });
    }
  }

  /**
   * Retrieves the single signature record registered for a given user.
   * Returns the record itself, not a collection, because the
   * 'id_usuario_firmacertificado' column is UNIQUE — a given user can
   * only ever be registered as a signer once.
   *
   * @param {number|string} userId
   * @returns {Promise<Object>}
   */
  async getBySigner(userId) {

    if (!userId) {
      throw Boom.badRequest('No signer identifier was provided');
    }

    try {
      const theSignature = await CertificateSignature.findOne({
        where: { userId },
        include: CertificateSignatureServices.CATALOG_INCLUDES,
      });

      if (!theSignature) {
        throw Boom.notFound('No certificate signature was found for the provided signer');
      }

      return CertificateSignatureServices._formatCertificateSignature(theSignature);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificate signature for the given signer' });
    }
  }

  /**
   * Retrieves the single signature record (if any) linking a specific
   * signer to a specific certificate. Useful to check whether a given
   * user has already signed a given certificate before attempting to
   * register the signature.
   *
   * @param {number|string} certificateId
   * @param {number|string} userId
   * @returns {Promise<Object>}
   */
  async getByCertificateAndSigner(certificateId, userId) {

    if (!certificateId || !userId) {
      throw Boom.badRequest('Both a certificate identifier and a signer identifier must be provided');
    }

    try {
      const theSignature = await CertificateSignature.findOne({
        where: { certificateId, userId },
        include: CertificateSignatureServices.CATALOG_INCLUDES,
      });

      if (!theSignature) {
        throw Boom.notFound('No signature was found for the provided certificate and signer');
      }

      return CertificateSignatureServices._formatCertificateSignature(theSignature);

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to find the certificate signature for the given certificate and signer'
      });
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
   * Finds a certificate signature by its primary key. Used internally
   * by write operations (updateOne/deleteOne) that only need to check
   * existence, so it intentionally does NOT eager-load the signer/
   * certificate/municipality associations — callers that need the
   * formatted, nested shape should go through listOne() instead.
   *
   * @private
   * @param {number|string} certificateSignatureId
   * @returns {Promise<CertificateSignature|null>}
   */
  async _findById(certificateSignatureId) {
    return CertificateSignature.findOne({ where: { id: certificateSignatureId } });
  }

  /**
   * Finds a certificate signature by its signer id. Mirrors the UNIQUE
   * constraint on 'id_usuario_firmacertificado'.
   *
   * @private
   * @param {number|string} userId
   * @returns {Promise<CertificateSignature|null>}
   */
  async _findBySigner(userId) {
    return CertificateSignature.findOne({ where: { userId } });
  }

  /**
   * Finds a certificate signature by its (certificateId, userId)
   * composite business key.
   *
   * @private
   * @param {number|string} certificateId
   * @param {number|string} userId
   * @returns {Promise<CertificateSignature|null>}
   */
  async _findByCertificateAndSigner(certificateId, userId) {
    return CertificateSignature.findOne({ where: { certificateId, userId } });
  }

  /**
   * Verifies that a referenced entity (User, Certificate, or
   * Municipality) exists.
   *
   * @private
   * @param {import('sequelize').ModelStatic} model
   * @param {number|string} id
   * @param {string} name
   * @throws {Boom}
   * @returns {Promise<void>}
   */
  async _assertExists(model, id, name) {
    const record = await model.findOne({ where: { id } });

    if (!record) {
      throw Boom.notFound(`${name} with id ${id} does not exist`);
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
   * Sequelize include for the related signer User, exposing only the
   * identifying fields without pulling in the full record (e.g. password,
   * address).
   *
   * @static
   */
  static USER_INCLUDE = {
    model: User,
    as: 'signer',
    attributes: ['id', 'username', 'firstName', 'lastName'],
  };

  /**
   * Sequelize include for the related Certificate, exposing only the
   * fields needed to identify the certificate without pulling in
   * unrelated columns.
   *
   * @static
   */
  static CERTIFICATE_INCLUDE = {
    model: Certificate,
    as: 'certificate',
    attributes: ['id', 'actNumber', 'issueDate', 'status'],
  };

  /**
   * Sequelize include for the related Municipality, exposing only the
   * id and name.
   *
   * @static
   */
  static MUNICIPALITY_INCLUDE = {
    model: Municipality,
    as: 'municipality',
    attributes: ['id', 'name'],
  };

  /**
   * The set of Sequelize includes shared by every read method that
   * needs to embed the related signer, certificate, and municipality
   * as nested objects rather than raw foreign key integers.
   *
   * @static
   */
  static CATALOG_INCLUDES = [
    CertificateSignatureServices.USER_INCLUDE,
    CertificateSignatureServices.CERTIFICATE_INCLUDE,
    CertificateSignatureServices.MUNICIPALITY_INCLUDE,
  ];

  /**
   * Reshapes a CertificateSignature Sequelize instance (with its
   * 'signer', 'certificate', and 'municipality' associations eagerly
   * loaded via CATALOG_INCLUDES) into a plain object where the raw
   * 'userId'/'certificateId'/'municipalityId' foreign keys are replaced
   * by nested { id, ... } objects.
   *
   * @private
   * @static
   * @param {CertificateSignature} certificateSignature
   * @returns {Object}
   */
  static _formatCertificateSignature(certificateSignature) {
    const {
      userId,
      certificateId,
      municipalityId,
      signer,
      certificate,
      municipality,
      ...rest
    } = certificateSignature.toJSON();

    return {
      ...rest,
      signer: signer ?? null,
      certificate: certificate ?? null,
      municipality: municipality ?? null,
    };
  }
}
