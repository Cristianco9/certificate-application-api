import { Certificate } from '../db/models/certificate.js';
import { CertificateEnrollment } from '../db/models/certificateEnrollment.js';
import { User } from '../db/models/user.js';
import { Institution } from '../db/models/institution.js';
import { Enrollment } from '../db/models/enrollment.js';
import { CertificateRecipient } from '../db/models/certificateRecipient.js';
import { Student } from '../db/models/student.js';
import { Group } from '../db/models/group.js';
import { Grade } from '../db/models/grade.js';
import { CertificateSignature } from '../db/models/certificateSignature.js';
import { sequelize } from '../libraries/DBConnection.js';
import { Op } from 'sequelize';
import Boom from '@hapi/boom';

export class CertificateServices {

  // ==========================================================
  // CREATE
  // ==========================================================

  /**
   * Creates a certificate for one OR MORE enrollments. All enrollments
   * are inserted into the bridge table `certificado_matricula` inside
   * the same transaction that creates the certificate row, so either
   * the whole group is committed or nothing is.
   *
   * @param {Object} newCertificate
   * @param {string|Date} newCertificate.issueDate
   * @param {number|string} newCertificate.userId
   * @param {number|string} newCertificate.institutionId
   * @param {Array<number|string>} newCertificate.enrollmentIds - 1..N enrollments
   * @param {number|string} [newCertificate.recipientId]
   * @param {string} [newCertificate.status] - Defaults to 'EMITIDO'
   * @returns {Promise<{status: string, actNumber: string, enrollmentIds: Array}>}
   */
  async createOne(newCertificate) {
    try {
      if (newCertificate.status) {
        CertificateServices._assertValidStatus(newCertificate.status);
      }

      // Normalize + validate the enrollment array
      const enrollmentIds = CertificateServices._normalizeEnrollmentIds(
        newCertificate.enrollmentIds
      );

      // Validate referenced parents
      await this._assertExists(User, newCertificate.userId, 'User');
      await this._assertExists(Institution, newCertificate.institutionId, 'Institution');
      for (const enrollmentId of enrollmentIds) {
        await this._assertExists(Enrollment, enrollmentId, 'Enrollment');
      }
      if (newCertificate.recipientId) {
        await this._assertExists(
          CertificateRecipient,
          newCertificate.recipientId,
          'CertificateRecipient'
        );
      }

      // No enrollment may already belong to another certificate
      await this._assertEnrollmentsAreFree(enrollmentIds);

      // Retry loop around act-number collision
      const MAX_ATTEMPTS = 5;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const actNumber = await this._generateNextActNumber();
        const transaction = await sequelize.transaction();

        try {
          const certificate = await Certificate.create(
            {
              actNumber,
              issueDate: newCertificate.issueDate,
              userId: newCertificate.userId,
              institutionId: newCertificate.institutionId,
              recipientId: newCertificate.recipientId ?? null,
              status: newCertificate.status ?? 'EMITIDO',
            },
            { transaction }
          );

          await CertificateEnrollment.bulkCreate(
            enrollmentIds.map((enrollmentId) => ({
              certificateId: certificate.id,
              enrollmentId,
            })),
            { transaction }
          );

          await transaction.commit();

          return {
            status: 'CREATED SUCCESSFULLY',
            actNumber,
            enrollmentIds,
          };

        } catch (insertError) {
          await transaction.rollback();

          // Retry ONLY on act-number collision
          if (insertError.name === 'SequelizeUniqueConstraintError') {
            const fields = insertError.fields ?? {};

            if (Object.prototype.hasOwnProperty.call(fields, 'numero_acta_certificado')) {
              continue; // pick a new act number and retry
            }

            // A bridge-row collision means an enrollment got claimed in
            // a concurrent request; not retryable.
            if (Object.prototype.hasOwnProperty.call(fields, 'id_matricula')) {
              throw Boom.conflict('One of the provided enrollments is already linked to a certificate');
            }
          }

          throw insertError;
        }
      }

      throw Boom.internal('Unable to generate a unique act number after multiple attempts');

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the certificate in the database',
      });
    }
  }

  // ==========================================================
  // UPDATE  (enrollments are NOT editable; identity fields frozen)
  // ==========================================================

  async updateOne(certificateId, newCertificateData) {
    if (!newCertificateData) throw Boom.badRequest('No data was provided to update');

    try {
      const existingCertificate = await this._findById(certificateId);
      if (!existingCertificate) throw Boom.notFound('Certificate not found');

      if (newCertificateData.status) {
        CertificateServices._assertValidStatus(newCertificateData.status);
      }

      if (newCertificateData.recipientId) {
        await this._assertExists(
          CertificateRecipient,
          newCertificateData.recipientId,
          'CertificateRecipient'
        );
      }

      const updateData = {};
      if (newCertificateData.issueDate !== undefined) updateData.issueDate = newCertificateData.issueDate;
      if (newCertificateData.recipientId !== undefined) updateData.recipientId = newCertificateData.recipientId || null;
      if (newCertificateData.status !== undefined) updateData.status = newCertificateData.status;

      const [updatedRows] = await Certificate.update(updateData, { where: { id: certificateId } });
      if (!updatedRows) throw Boom.notFound('Certificate not found');

      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the certificate in the database' });
    }
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  async deleteOne(certificateId) {
    if (!certificateId) throw Boom.badRequest('No certificate identifier was provided');

    try {
      const existingCertificate = await this._findById(certificateId);
      if (!existingCertificate) throw Boom.notFound('Certificate not found');

      await this._assertNoAssociatedSignatures(certificateId);

      // The bridge rows are removed automatically by ON DELETE CASCADE,
      // but we destroy them explicitly for clarity / portability.
      const transaction = await sequelize.transaction();
      try {
        await CertificateEnrollment.destroy({
          where: { certificateId },
          transaction,
        });
        const deletedRows = await Certificate.destroy({
          where: { id: certificateId },
          transaction,
        });
        await transaction.commit();
        if (!deletedRows) throw Boom.notFound('Certificate not found');
      } catch (err) {
        await transaction.rollback();
        throw err;
      }

      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the certificate from the database' });
    }
  }

  // ==========================================================
  // READS
  // ==========================================================

  async listOne(certificateId) {
    if (!certificateId) throw Boom.badRequest('No certificate identifier was provided');
    try {
      const theCertificate = await Certificate.findOne({
        where: { id: certificateId },
        include: CertificateServices.CATALOG_INCLUDES,
      });
      if (!theCertificate) throw Boom.notFound('Certificate not found');
      return CertificateServices._formatCertificate(theCertificate);
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificate' });
    }
  }

  async listAll() {
    try {
      const all = await Certificate.findAll({
        order: [['id', 'ASC']],
        include: CertificateServices.CATALOG_INCLUDES,
      });
      const records = all.map(CertificateServices._formatCertificate);
      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificates' });
    }
  }

  async listByActNumber(actNumber) {
    if (!actNumber) throw Boom.badRequest('No act number was provided');
    try {
      const theCertificate = await Certificate.findOne({
        where: { actNumber },
        include: CertificateServices.CATALOG_INCLUDES,
      });
      if (!theCertificate) throw Boom.notFound('Certificate not found with the provided act number');
      return CertificateServices._formatCertificate(theCertificate);
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificate by its act number' });
    }
  }

  async listByPartialActNumber(partialActNumber) {
    if (!partialActNumber) throw Boom.badRequest('No search text was provided');
    try {
      const matching = await Certificate.findAll({
        where: { actNumber: { [Op.like]: `%${partialActNumber}%` } },
        order: [['actNumber', 'DESC']],
        include: CertificateServices.CATALOG_INCLUDES,
      });
      const records = matching.map(CertificateServices._formatCertificate);
      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to search the certificates' });
    }
  }

  /**
   * Given an enrollmentId, return the certificate (if any) that owns it.
   * Backed by the UNIQUE index on bridge.id_matricula, so at most one
   * certificate can be returned.
   */
  async getByEnrollment(enrollmentId) {
    if (!enrollmentId) throw Boom.badRequest('No enrollment identifier was provided');

    try {
      const link = await CertificateEnrollment.findOne({ where: { enrollmentId } });
      if (!link) throw Boom.notFound('No certificate was found for the provided enrollment');
      return await this.listOne(link.certificateId);
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the certificate for the given enrollment' });
    }
  }

  async listByUser(userId) {
    if (!userId) throw Boom.badRequest('No user identifier was provided');
    try {
      const rows = await Certificate.findAll({
        where: { userId },
        order: [['actNumber', 'DESC']],
        include: CertificateServices.CATALOG_INCLUDES,
      });
      const records = rows.map(CertificateServices._formatCertificate);
      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find certificates for the given user' });
    }
  }

  async listByInstitution(institutionId) {
    if (!institutionId) throw Boom.badRequest('No institution identifier was provided');
    try {
      const rows = await Certificate.findAll({
        where: { institutionId },
        order: [['actNumber', 'DESC']],
        include: CertificateServices.CATALOG_INCLUDES,
      });
      const records = rows.map(CertificateServices._formatCertificate);
      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find certificates for the given institution' });
    }
  }

  async listByRecipient(recipientId) {
    if (!recipientId) throw Boom.badRequest('No recipient identifier was provided');
    try {
      const rows = await Certificate.findAll({
        where: { recipientId },
        order: [['actNumber', 'DESC']],
        include: CertificateServices.CATALOG_INCLUDES,
      });
      const records = rows.map(CertificateServices._formatCertificate);
      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find certificates for the given recipient' });
    }
  }

  async listByStatus(status) {
    if (!status) throw Boom.badRequest('No status was provided');
    CertificateServices._assertValidStatus(status);
    try {
      const rows = await Certificate.findAll({
        where: { status },
        order: [['actNumber', 'DESC']],
        include: CertificateServices.CATALOG_INCLUDES,
      });
      const records = rows.map(CertificateServices._formatCertificate);
      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find certificates with the given status' });
    }
  }

  async previewNextActNumber() {
    try {
      const actNumber = await this._generateNextActNumber();
      return { actNumber };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to compute the next act number' });
    }
  }

  // ==========================================================
  // PRIVATE HELPERS
  // ==========================================================

  async _findById(certificateId) {
    return Certificate.findOne({ where: { id: certificateId } });
  }

  async _assertExists(model, id, name) {
    const record = await model.findOne({ where: { id } });
    if (!record) throw Boom.notFound(`${name} with id ${id} does not exist`);
  }

  /**
   * Rejects an array that is empty, non-array, or contains duplicates.
   * Duplicates would make the bridge insert fail on the unique index
   * with a raw ORM error, so we surface a clear Boom.badRequest instead.
   */
  static _normalizeEnrollmentIds(raw) {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw Boom.badRequest('At least one enrollmentId must be provided');
    }

    const ids = raw.map((v) => Number(v));

    if (ids.some((n) => !Number.isInteger(n) || n <= 0)) {
      throw Boom.badRequest('Every enrollmentId must be a positive integer');
    }

    if (new Set(ids).size !== ids.length) {
      throw Boom.badRequest('Duplicate enrollmentIds are not allowed');
    }

    return ids;
  }

  /**
   * Rejects the request if ANY of the requested enrollments is already
   * linked to a certificate — mirrors the UNIQUE index on bridge.id_matricula.
   */
  async _assertEnrollmentsAreFree(enrollmentIds) {
    const existingLinks = await CertificateEnrollment.findAll({
      where: { enrollmentId: { [Op.in]: enrollmentIds } },
    });

    if (existingLinks.length > 0) {
      const alreadyUsed = existingLinks.map((l) => l.enrollmentId).join(', ');
      throw Boom.conflict(
        `The following enrollments are already linked to a certificate: ${alreadyUsed}`
      );
    }
  }

  async _assertNoAssociatedSignatures(certificateId) {
    const associatedSignature = await CertificateSignature.findOne({
      where: { certificateId },
    });
    if (associatedSignature) {
      throw Boom.conflict('The certificate cannot be deleted because it has associated signatures');
    }
  }

  async _generateNextActNumber() {
    const currentYear = new Date().getFullYear();
    const yearPrefix = String(currentYear).slice(-2);

    const lastCertificateOfYear = await Certificate.findOne({
      where: { actNumber: { [Op.like]: `${yearPrefix}-%` } },
      order: [['actNumber', 'DESC']],
    });

    let nextConsecutive = 1;
    if (lastCertificateOfYear) {
      const parts = lastCertificateOfYear.actNumber.split('-');
      const parsed = parseInt(parts[1], 10);
      if (!Number.isNaN(parsed)) nextConsecutive = parsed + 1;
    }

    if (nextConsecutive > 999) {
      throw Boom.conflict(
        `The maximum number of certificates for the year ${currentYear} has been reached (999)`
      );
    }

    return `${yearPrefix}-${String(nextConsecutive).padStart(3, '0')}`;
  }

  // ==========================================================
  // STATIC UTILITIES
  // ==========================================================

  static VALID_STATUSES = ['EMITIDO', 'ANULADO', 'REIMPRESO'];

  static _assertValidStatus(status) {
    if (!CertificateServices.VALID_STATUSES.includes(status)) {
      throw Boom.badRequest(
        `The certificate status must be one of: ${CertificateServices.VALID_STATUSES.join(', ')}`
      );
    }
  }

  static USER_INCLUDE = {
    model: User,
    as: 'issuer',
    attributes: ['id', 'username', 'firstName', 'lastName'],
  };

  static INSTITUTION_INCLUDE = {
    model: Institution,
    as: 'institution',
    attributes: ['id', 'name', 'institutionalCode'],
  };

  // Now a to-many include; `through.attributes: []` hides the bridge
  // columns so the client only sees real enrollment fields.
  static ENROLLMENTS_INCLUDE = {
    model: Enrollment,
    as: 'enrollments',
    attributes: ['id', 'enrollmentDate'],
    through: { attributes: [] },
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'firstName', 'middleName', 'firstLastName', 'secondLastName', 'documentNumber'],
      },
      {
        model: Group,
        as: 'group',
        attributes: ['id', 'name', 'year'],
        include: [{ model: Grade, as: 'grade', attributes: ['id', 'name'] }],
      },
    ],
  };

  static RECIPIENT_INCLUDE = {
    model: CertificateRecipient,
    as: 'recipient',
    attributes: ['id', 'firstName', 'middleName', 'lastName', 'secondLastName', 'documentNumber'],
  };

  static CATALOG_INCLUDES = [
    CertificateServices.USER_INCLUDE,
    CertificateServices.INSTITUTION_INCLUDE,
    CertificateServices.ENROLLMENTS_INCLUDE,   // ← renamed
    CertificateServices.RECIPIENT_INCLUDE,
  ];

  static _formatCertificate(certificate) {
    const {
      userId,
      institutionId,
      recipientId,
      issuer,
      institution,
      enrollments,
      recipient,
      ...rest
    } = certificate.toJSON();

    return {
      ...rest,
      issuer: issuer ?? null,
      institution: institution ?? null,
      enrollments: enrollments ?? [],   // ← was singular `enrollment`
      recipient: recipient ?? null,
    };
  }
}
