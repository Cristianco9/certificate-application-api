// Import the CertificateEnrollment data model
import { CertificateEnrollment } from '../db/models/certificateEnrollment.js';
// Import related models to embed FK data as nested objects and to verify
// referential integrity before writing
import { Certificate } from '../db/models/certificate.js';
import { Enrollment } from '../db/models/enrollment.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the CertificateEnrollment
 * (certificado_matricula) bridge entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * This bridge is the many-to-many link between Certificate and Enrollment
 * that lets a single act number cover one OR MANY enrollments (each one
 * driving a report card inside the same certificate PDF). Two business
 * rules shape the schema and this service:
 *
 *   1. A certificate can carry MANY enrollments — so 'listByCertificate'
 *      returns a collection.
 *   2. An enrollment can belong to AT MOST ONE certificate — the
 *      'id_matricula' column carries a UNIQUE index. This is enforced here
 *      explicitly via _assertEnrollmentIsAvailable before any write, so a
 *      conflict surfaces a clear Boom.conflict instead of the raw ORM
 *      unique-constraint error.
 *
 * The certificate-issuance workflow (CertificateServices.createOne) links
 * every enrollment of a new certificate through this same table inside a
 * single transaction, so this service exists primarily to expose the
 * bridge as a first-class resource — for reporting, unlinking, and
 * administrative repair — without requiring a full certificate update.
 *
 * Every method that returns a CertificateEnrollment record embeds its
 * related certificate and enrollment as nested objects, rather than
 * exposing the raw 'certificateId'/'enrollmentId' foreign key integers.
 */
export class CertificateEnrollmentServices {

  // ==========================================================
  // PUBLIC METHODS (instance)
  // ==========================================================

  /**
   * Creates a new CertificateEnrollment record, linking an enrollment
   * to a certificate.
   *
   * @param {Object} newCertificateEnrollment
   * @param {number|string} newCertificateEnrollment.certificateId
   * @param {number|string} newCertificateEnrollment.enrollmentId
   * @returns {Promise<{status: string}>}
   */
  async createOne(newCertificateEnrollment) {

    try {
      // Verify the referenced certificate and enrollment actually exist
      // before linking them
      await this._assertExists(
        Certificate,
        newCertificateEnrollment.certificateId,
        'Certificate'
      );
      await this._assertExists(
        Enrollment,
        newCertificateEnrollment.enrollmentId,
        'Enrollment'
      );

      // Verify this exact link does not already exist, mirroring the
      // composite uniqueness of (certificateId, enrollmentId)
      const existingLink = await this._findByCertificateAndEnrollment(
        newCertificateEnrollment.certificateId,
        newCertificateEnrollment.enrollmentId
      );

      if (existingLink) {
        throw Boom.conflict('The enrollment is already linked to the provided certificate');
      }

      // Enforce the single-certificate rule: enrollmentId is UNIQUE, so
      // the enrollment must not already be linked to ANY other certificate
      await this._assertEnrollmentIsAvailable(
        newCertificateEnrollment.enrollmentId,
        newCertificateEnrollment.certificateId
      );

      // Create the record (id is generated automatically)
      await CertificateEnrollment.create({
        certificateId: newCertificateEnrollment.certificateId,
        enrollmentId: newCertificateEnrollment.enrollmentId,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to link the enrollment to the certificate in the database'
      });
    }
  }

  /**
   * Deletes a CertificateEnrollment record by its id.
   *
   * @param {number|string} certificateEnrollmentId
   * @returns {Promise<{status: string}>}
   */
  async deleteOne(certificateEnrollmentId) {

    if (!certificateEnrollmentId) {
      throw Boom.badRequest('No certificate-enrollment identifier was provided');
    }

    try {
      const existingLink = await this._findById(certificateEnrollmentId);

      if (!existingLink) {
        throw Boom.notFound('Certificate-enrollment link not found');
      }

      const deletedRows = await CertificateEnrollment.destroy({
        where: { id: certificateEnrollmentId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Certificate-enrollment link not found');
      }

      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to unlink the enrollment from the certificate in the database'
      });
    }
  }

  /**
   * Deletes a CertificateEnrollment record by its composite key
   * (certificateId + enrollmentId). Convenience equivalent of looking
   * up the id first, then calling deleteOne — matches the shape callers
   * usually already have.
   *
   * @param {number|string} certificateId
   * @param {number|string} enrollmentId
   * @returns {Promise<{status: string}>}
   */
  async unlinkByCertificateAndEnrollment(certificateId, enrollmentId) {

    if (!certificateId || !enrollmentId) {
      throw Boom.badRequest(
        'Both a certificate identifier and an enrollment identifier must be provided'
      );
    }

    try {
      const deletedRows = await CertificateEnrollment.destroy({
        where: { certificateId, enrollmentId }
      });

      if (!deletedRows) {
        throw Boom.notFound(
          'The enrollment is not currently linked to the provided certificate'
        );
      }

      return { status: 'UNLINKED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to unlink the enrollment from the certificate in the database'
      });
    }
  }

  /**
   * Retrieves a single CertificateEnrollment record by its id, embedding
   * its related certificate and enrollment as nested objects.
   *
   * @param {number|string} certificateEnrollmentId
   * @returns {Promise<Object>}
   */
  async listOne(certificateEnrollmentId) {

    if (!certificateEnrollmentId) {
      throw Boom.badRequest('No certificate-enrollment identifier was provided');
    }

    try {
      const theLink = await CertificateEnrollment.findOne({
        where: { id: certificateEnrollmentId },
        include: CertificateEnrollmentServices.CATALOG_INCLUDES,
      });

      if (!theLink) {
        throw Boom.notFound('Certificate-enrollment link not found');
      }

      return CertificateEnrollmentServices._formatCertificateEnrollment(theLink);

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to find the certificate-enrollment link'
      });
    }
  }

  /**
   * Retrieves all CertificateEnrollment records, ordered by id ascending,
   * each with its related certificate and enrollment embedded as nested
   * objects.
   *
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listAll() {

    try {
      const allLinks = await CertificateEnrollment.findAll({
        order: [['id', 'ASC']],
        include: CertificateEnrollmentServices.CATALOG_INCLUDES,
      });

      const records = allLinks.map(
        CertificateEnrollmentServices._formatCertificateEnrollment
      );

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to find the certificate-enrollment links'
      });
    }
  }

  /**
   * Retrieves every CertificateEnrollment record belonging to a given
   * certificate, each with its related enrollment embedded as a nested
   * object. This is the primary lookup used to render the multi-enrollment
   * section of a certificate PDF.
   *
   * @param {number|string} certificateId
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listByCertificate(certificateId) {

    if (!certificateId) {
      throw Boom.badRequest('No certificate identifier was provided');
    }

    try {
      const linksByCertificate = await CertificateEnrollment.findAll({
        where: { certificateId },
        order: [['id', 'ASC']],
        include: CertificateEnrollmentServices.CATALOG_INCLUDES,
      });

      const records = linksByCertificate.map(
        CertificateEnrollmentServices._formatCertificateEnrollment
      );

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to find the certificate-enrollment links for the given certificate'
      });
    }
  }

  /**
   * Retrieves every CertificateEnrollment record referencing a given
   * enrollment, each with its related certificate embedded as a nested
   * object. In practice this returns at most one record, since the
   * 'id_matricula' column is UNIQUE — an enrollment belongs to at most
   * one certificate.
   *
   * @param {number|string} enrollmentId
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listByEnrollment(enrollmentId) {

    if (!enrollmentId) {
      throw Boom.badRequest('No enrollment identifier was provided');
    }

    try {
      const linksByEnrollment = await CertificateEnrollment.findAll({
        where: { enrollmentId },
        order: [['id', 'ASC']],
        include: CertificateEnrollmentServices.CATALOG_INCLUDES,
      });

      const records = linksByEnrollment.map(
        CertificateEnrollmentServices._formatCertificateEnrollment
      );

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to find the certificate-enrollment links for the given enrollment'
      });
    }
  }

  /**
   * Retrieves the single CertificateEnrollment record (if any) linking a
   * specific certificate to a specific enrollment. Useful to check
   * whether an enrollment is already owned by a certificate before
   * attempting a new link.
   *
   * @param {number|string} certificateId
   * @param {number|string} enrollmentId
   * @returns {Promise<Object>}
   */
  async getByCertificateAndEnrollment(certificateId, enrollmentId) {

    if (!certificateId || !enrollmentId) {
      throw Boom.badRequest(
        'Both a certificate identifier and an enrollment identifier must be provided'
      );
    }

    try {
      const theLink = await CertificateEnrollment.findOne({
        where: { certificateId, enrollmentId },
        include: CertificateEnrollmentServices.CATALOG_INCLUDES,
      });

      if (!theLink) {
        throw Boom.notFound(
          'No link was found between the provided certificate and enrollment'
        );
      }

      return CertificateEnrollmentServices._formatCertificateEnrollment(theLink);

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to find the certificate-enrollment link for the given certificate and enrollment'
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
   * Finds a CertificateEnrollment record by its primary key.
   *
   * @private
   * @param {number|string} certificateEnrollmentId
   * @returns {Promise<CertificateEnrollment|null>}
   */
  async _findById(certificateEnrollmentId) {
    return CertificateEnrollment.findOne({ where: { id: certificateEnrollmentId } });
  }

  /**
   * Finds a CertificateEnrollment record by its (certificateId,
   * enrollmentId) composite business key.
   *
   * @private
   * @param {number|string} certificateId
   * @param {number|string} enrollmentId
   * @returns {Promise<CertificateEnrollment|null>}
   */
  async _findByCertificateAndEnrollment(certificateId, enrollmentId) {
    return CertificateEnrollment.findOne({ where: { certificateId, enrollmentId } });
  }

  /**
   * Verifies that a referenced entity (Certificate or Enrollment) exists.
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

  /**
   * Enforces the UNIQUE constraint on 'id_matricula' at the service
   * layer: an enrollment may only ever be linked to ONE certificate.
   * Since createOne has already ruled out a duplicate link to the SAME
   * certificate, any link found here means the enrollment belongs to a
   * different certificate entirely.
   *
   * @private
   * @param {number|string} enrollmentId - The enrollment being linked.
   * @param {number|string} requestingCertificateId - The certificate requesting the link.
   * @throws {Boom} - A conflict error naming the existing certificate.
   * @returns {Promise<void>}
   */
  async _assertEnrollmentIsAvailable(enrollmentId, requestingCertificateId) {
    const existingLink = await CertificateEnrollment.findOne({
      where: { enrollmentId }
    });

    if (
      existingLink &&
      Number(existingLink.certificateId) !== Number(requestingCertificateId)
    ) {
      throw Boom.conflict(
        `The enrollment is already linked to certificate id ${existingLink.certificateId}`
      );
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
   * Sequelize include for the related Certificate, exposing only the
   * identifying fields without pulling in the full row (issuer,
   * institution, recipient, enrollments).
   *
   * @static
   */
  static CERTIFICATE_INCLUDE = {
    model: Certificate,
    as: 'certificate',
    attributes: ['id', 'actNumber', 'issueDate', 'status'],
  };

  /**
   * Sequelize include for the related Enrollment, kept shallow (id and
   * enrollment date only). A full student/group breakdown belongs to
   * EnrollmentServices, not here.
   *
   * @static
   */
  static ENROLLMENT_INCLUDE = {
    model: Enrollment,
    as: 'enrollment',
    attributes: ['id', 'enrollmentDate'],
  };

  /**
   * The set of Sequelize includes shared by every read method that
   * needs to embed the related certificate and enrollment as nested
   * objects rather than raw foreign key integers.
   *
   * @static
   */
  static CATALOG_INCLUDES = [
    CertificateEnrollmentServices.CERTIFICATE_INCLUDE,
    CertificateEnrollmentServices.ENROLLMENT_INCLUDE,
  ];

  /**
   * Reshapes a CertificateEnrollment Sequelize instance (with its
   * 'certificate' and 'enrollment' associations eagerly loaded via
   * CATALOG_INCLUDES) into a plain object where the raw
   * 'certificateId'/'enrollmentId' foreign keys are replaced by nested
   * { id, ... } objects.
   *
   * @private
   * @static
   * @param {CertificateEnrollment} certificateEnrollment
   * @returns {Object}
   */
  static _formatCertificateEnrollment(certificateEnrollment) {
    const {
      certificateId,
      enrollmentId,
      certificate,
      enrollment,
      ...rest
    } = certificateEnrollment.toJSON();

    return {
      ...rest,
      certificate: certificate ?? null,
      enrollment: enrollment ?? null,
    };
  }
}
