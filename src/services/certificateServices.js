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
   * RE-ISSUANCE IS EXPECTED: the same student, the same enrollments,
   * the same recipient, the same institution and the same signers may
   * be submitted any number of times. Each call produces a NEW
   * certificate row with a NEW act number and a NEW issue date. There
   * is no "reprint" concept — every request is a fresh issuance. The
   * bridge only enforces UNIQUE on the composite
   * (certificateId, enrollmentId) pair, so an enrollment can appear in
   * many certificates.
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

          // Retry ONLY on act-number collision. The bridge's composite
          // unique (certificateId, enrollmentId) cannot collide here,
          // because enrollmentIds are already guaranteed unique within
          // this request (see _normalizeEnrollmentIds), and the
          // certificate id is brand new on each attempt.
          if (insertError.name === 'SequelizeUniqueConstraintError') {
            const fields = insertError.fields ?? {};

            if (Object.prototype.hasOwnProperty.call(fields, 'numero_acta_certificado')) {
              continue; // pick a new act number and retry
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
   * Lists certificates for the repository page, with pagination and
   * optional filters.
   *
   * Uses a three-query strategy to keep pagination correct with a
   * many-to-many include (Certificate ↔ Enrollment):
   *
   *   1. Collect the paginated certificate IDs, applying every filter.
   *   2. Count the total matching certificates (for the pager).
   *   3. Fetch the full records for the collected IDs.
   *
   * `findAndCountAll` alone would produce duplicated rows (one per
   * matching enrollment) and a misleading `LIMIT`, so the ID-first
   * approach is preferred here — even at the cost of one extra round
   * trip, which is negligible compared to the alternative of an
   * incorrect page count.
   *
   * @param {Object} [options]
   * @param {number} [options.offset=0]  Rows to skip.
   * @param {number} [options.limit=20]  Rows per page.
   * @param {Object} [options.filters]   Optional filters.
   * @returns {Promise<{total: number, records: Object[], offset: number, limit: number}>}
   */
  async listForRepository({ offset = 0, limit = 20, filters = {} } = {}) {
    try {
      // ── Certificate-level where ─────────────────────────────────────
      const certificateWhere = {};
      if (filters.actNumber) {
        certificateWhere.actNumber = { [Op.like]: `%${filters.actNumber}%` };
      }
      if (filters.issuerId) certificateWhere.userId = filters.issuerId;
      if (filters.status) certificateWhere.status = filters.status;
      if (filters.institutionId) {
        certificateWhere.institutionId = filters.institutionId;
      }
      if (filters.issueDateFrom || filters.issueDateTo) {
        certificateWhere.issueDate = {};
        if (filters.issueDateFrom) {
          certificateWhere.issueDate[Op.gte] = filters.issueDateFrom;
        }
        if (filters.issueDateTo) {
          certificateWhere.issueDate[Op.lte] = filters.issueDateTo;
        }
      }

      // ── Student-level where (joined through enrollments) ────────────
      const studentWhere = {};
      if (filters.firstName) {
        studentWhere.firstName = { [Op.like]: `%${filters.firstName}%` };
      }
      if (filters.secondName) {
        studentWhere.middleName = { [Op.like]: `%${filters.secondName}%` };
      }
      if (filters.firstLastName) {
        studentWhere.firstLastName = { [Op.like]: `%${filters.firstLastName}%` };
      }
      if (filters.secondLastName) {
        studentWhere.secondLastName = { [Op.like]: `%${filters.secondLastName}%` };
      }
      if (filters.documentNumber) {
        studentWhere.documentNumber = filters.documentNumber;
      }
      if (filters.documentTypeId) {
        studentWhere.documentTypeId = filters.documentTypeId;
      }
      if (filters.birthDate) studentWhere.birthDate = filters.birthDate;

      // ── Group-level where (joined through enrollments) ──────────────
      const groupWhere = {};
      if (filters.year) groupWhere.year = filters.year;
      if (filters.gradeId) groupWhere.gradeId = filters.gradeId;
      if (filters.group) groupWhere.name = { [Op.like]: `%${filters.group}%` };
      if (filters.jornada) groupWhere.shift = filters.jornada;

      // ── Recipient-level where ───────────────────────────────────────
      const recipientWhere = {};
      if (filters.recipientName) {
        recipientWhere[Op.or] = [
          { firstName: { [Op.like]: `%${filters.recipientName}%` } },
          { lastName: { [Op.like]: `%${filters.recipientName}%` } },
        ];
      }
      if (filters.recipientDocument) {
        recipientWhere.documentNumber = filters.recipientDocument;
      }

      const studentHasFilter = Object.keys(studentWhere).length > 0;
      const groupHasFilter = Object.keys(groupWhere).length > 0;
      const enrollmentRequired = studentHasFilter || groupHasFilter;
      const recipientHasFilter = Object.keys(recipientWhere).length > 0;

      // Include used ONLY to filter (attributes: []) — no data is
      // returned from it in the ID query, so the SQL stays cheap.
      const enrollmentFilterInclude = {
        model: Enrollment,
        as: 'enrollments',
        through: { attributes: [] },
        attributes: [],
        required: enrollmentRequired,
        include: [
          {
            model: Student,
            as: 'student',
            attributes: [],
            required: studentHasFilter,
            where: studentHasFilter ? studentWhere : undefined,
          },
          {
            model: Group,
            as: 'group',
            attributes: [],
            required: groupHasFilter,
            where: groupHasFilter ? groupWhere : undefined,
          },
        ],
      };

      // ── 1. Paginated certificate IDs ────────────────────────────────
      const idRows = await Certificate.findAll({
        where: certificateWhere,
        attributes: ['id'],
        include: enrollmentFilterInclude,
        order: [['id', 'DESC']],
        limit,
        offset,
        subQuery: false,
        // Group by the outer primary key so a certificate with N
        // matching enrollments collapses back to 1 row. `id` is the
        // SELECT alias (`certificado.id_certificado AS id`), which MySQL
        // resolves against the select list — unlike the string
        // 'Certificate.id', which Sequelize emits verbatim and MySQL
        // then rejects with "Unknown column 'Certificate.id' in
        // 'group statement'".
        group: ['id'],
      });

      const ids = idRows.map((row) => row.id);

      // ── 2. Total count ──────────────────────────────────────────────
      //
      // `distinct: true` makes Sequelize emit
      //   COUNT(DISTINCT(`certificado`.`<col>`))
      // and — unlike `attributes`, `order` or `group` — the `col`
      // option is treated as a RAW column reference, NOT as a model
      // attribute. Passing `'id'` therefore produced
      //   COUNT(DISTINCT(`certificado`.`id`))
      // and MySQL rejected it with "Unknown column 'certificado.id'
      // in 'field list'", because the real column is
      // `id_certificado` (the model maps `id → id_certificado` via
      // the `field:` option, but `col` skips that mapping).
      //
      // Fix: use the PHYSICAL column name. Alternatively, drop `col`
      // entirely and let Sequelize default to the model's
      // `primaryKeyField` (`id_certificado`), which produces the same
      // SQL.
      const total = await Certificate.count({
        where: certificateWhere,
        include: enrollmentFilterInclude,
        distinct: true,
        col: 'id_certificado',
      });

      if (ids.length === 0) {
        return { total, records: [], offset, limit };
      }

      // ── 3. Full records for the collected IDs ──────────────────────
      const records = await Certificate.findAll({
        where: { id: { [Op.in]: ids } },
        include: [
          {
            model: User,
            as: 'issuer',
            attributes: ['id', 'firstName', 'lastName'],
          },
          {
            model: Institution,
            as: 'institution',
            attributes: ['id', 'name'],
          },
          {
            model: CertificateRecipient,
            as: 'recipient',
            attributes: [
              'id',
              'firstName',
              'middleName',
              'lastName',
              'secondLastName',
              'documentNumber',
            ],
            required: recipientHasFilter,
            where: recipientHasFilter ? recipientWhere : undefined,
          },
          {
            model: Enrollment,
            as: 'enrollments',
            through: { attributes: [] },
            attributes: ['id', 'enrollmentDate'],
            include: [
              {
                model: Student,
                as: 'student',
                attributes: [
                  'id',
                  'firstName',
                  'middleName',
                  'firstLastName',
                  'secondLastName',
                  'documentNumber',
                ],
              },
              {
                model: Group,
                as: 'group',
                attributes: ['id', 'name', 'year', 'shift'],
                include: [
                  { model: Grade, as: 'grade', attributes: ['id', 'name'] },
                ],
              },
            ],
          },
        ],
        order: [['id', 'DESC']],
      });

      return { total, records, offset, limit };
    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to search certificates for the repository',
      });
    }
  }

  /**
   * Given an enrollmentId, return the certificate that most recently
   * certified it — the highest certificateId among all issuances.
   *
   * The bridge no longer enforces UNIQUE on id_matricula, so an
   * enrollment may appear in many certificates (one per issuance). This
   * method returns the LATEST one, which is what callers mean by
   * "the certificate for this enrollment". To enumerate every issuance,
   * use listByEnrollment.
   */
  async getByEnrollment(enrollmentId) {
    if (!enrollmentId) throw Boom.badRequest('No enrollment identifier was provided');

    try {
      const link = await CertificateEnrollment.findOne({
        where: { enrollmentId },
        order: [['certificateId', 'DESC']],
      });

      if (!link) {
        throw Boom.notFound('No certificate was found for the provided enrollment');
      }

      return await this.listOne(link.certificateId);
    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to find the certificate for the given enrollment',
      });
    }
  }

  /**
   * Given an enrollmentId, return EVERY certificate that has ever
   * certified it, ordered from newest to oldest.
   *
   * Each row is a distinct legal document issued at a different moment,
   * all carrying identical content (student, enrollments, recipient,
   * institution, signers). Only the act number and the issue date differ.
   */
  async listByEnrollment(enrollmentId) {
    if (!enrollmentId) throw Boom.badRequest('No enrollment identifier was provided');

    try {
      const links = await CertificateEnrollment.findAll({
        where: { enrollmentId },
        order: [['certificateId', 'DESC']],
      });

      const records = await Promise.all(
        links.map((link) => this.listOne(link.certificateId))
      );

      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to list the certificates for the given enrollment',
      });
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
   * Duplicates would make the bridge insert fail on the composite unique
   * index with a raw ORM error, so we surface a clear Boom.badRequest
   * instead.
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

  // A to-many include; `through.attributes: []` hides the bridge
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
    CertificateServices.ENROLLMENTS_INCLUDE,
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
      enrollments: enrollments ?? [],
      recipient: recipient ?? null,
    };
  }
}
