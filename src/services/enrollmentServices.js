// Import the Enrollment data model
import { Enrollment } from '../db/models/enrollment.js';
// Import related catalog models to embed FK data as nested objects
import { Student } from '../db/models/student.js';
import { Group } from '../db/models/group.js';
// Import the models that reference Enrollment, needed to enforce the delete-guard business rules
import { Certificate } from '../db/models/certificate.js';
import { Score } from '../db/models/score.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Enrollment (matricula) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * Both 'studentId' and 'groupId' are nullable at the database level
 * (see migrations/20260707184734-enrollment.cjs), since 'matricula'
 * references 'estudiante' and 'grupo' with onDelete: 'SET NULL' — this
 * lets an enrollment (and the historical academic record hanging off
 * it) survive even if the student or group is later removed. Creating
 * a new enrollment, however, is a deliberate business action that
 * always links a specific student to a specific group, so this service
 * requires both foreign keys at creation time, even though the column
 * itself allows NULL.
 *
 * The database enforces a composite unique index on
 * (id_estudiante_matricula, id_grupo_matricula) — a student can only be
 * enrolled once in the same group — but this service still checks that
 * combination explicitly before writing, per AGENTS.md section 6
 * ('Antes de mutar datos, se valida la existencia/condición previa'),
 * so a duplicate enrollment surfaces a clear Boom.conflict instead of
 * the raw ORM unique-constraint error.
 *
 * 'certificado' and 'calificacion' both reference 'matricula' with
 * onDelete: 'RESTRICT' — a certificate can only ever be issued once per
 * enrollment (context.md: reprints reuse the same certificate record),
 * and scores belong to the academic history tied to the enrollment.
 * The deletion guard below checks both.
 *
 * Every method that returns an Enrollment record (listOne, listAll,
 * listByStudent, listByGroup, getByStudentAndGroup) embeds its related
 * student and group as nested objects, rather than exposing the raw
 * 'studentId'/'groupId' foreign key integers.
 */
export class EnrollmentServices {


  /**
   * Creates a new enrollment record in the database, linking a student
   * to a group on a given date.
   *
   * @param {Object} newEnrollment
   * @param {number} newEnrollment.studentId
   * @param {number} newEnrollment.groupId
   * @param {string} newEnrollment.enrollmentDate
   * @returns {Promise<{status: string}>}
   */
  async createOne(newEnrollment) {

    try {

      // Verify the referenced student and group actually exist before
      // linking them
      await this._assertExists(Student, newEnrollment.studentId, 'Student');
      await this._assertExists(Group, newEnrollment.groupId, 'Group');

      // Verify the student is not already enrolled in that same group,
      // mirroring the composite unique index defined at the database level
      const existingEnrollment = await this._findByStudentAndGroup(
        newEnrollment.studentId, newEnrollment.groupId
      );

      if (existingEnrollment) {
        throw Boom.conflict('The student is already enrolled in the provided group');
      }

      // Create the record (id is generated automatically)
      await Enrollment.create({
        studentId: newEnrollment.studentId,
        groupId: newEnrollment.groupId,
        enrollmentDate: newEnrollment.enrollmentDate,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the enrollment in the database'
      });
    }
  }

  /**
   * Updates an existing enrollment record.
   *
   * @param {number} enrollmentId
   * @param {Object} newEnrollmentData
   * @param {number} [newEnrollmentData.studentId]
   * @param {number} [newEnrollmentData.groupId]
   * @param {string} [newEnrollmentData.enrollmentDate]
   * @returns {Promise<{status: string}>}
   */
  async updateOne(enrollmentId, newEnrollmentData) {

    if (!newEnrollmentData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the enrollment exists before attempting the update
      const existingEnrollment = await this._findById(enrollmentId);

      if (!existingEnrollment) {
        throw Boom.notFound('Enrollment not found');
      }

      // If a new student is provided, verify it actually exists
      if (newEnrollmentData.studentId) {
        await this._assertExists(Student, newEnrollmentData.studentId, 'Student');
      }

      // If a new group is provided, verify it actually exists
      if (newEnrollmentData.groupId) {
        await this._assertExists(Group, newEnrollmentData.groupId, 'Group');
      }

      // If either half of the composite key changes, verify the
      // resulting combination is not already used by another enrollment
      if (newEnrollmentData.studentId || newEnrollmentData.groupId) {
        const enrollmentWithSameKey = await this._findByStudentAndGroup(
          newEnrollmentData.studentId ?? existingEnrollment.studentId,
          newEnrollmentData.groupId ?? existingEnrollment.groupId
        );

        if (enrollmentWithSameKey && enrollmentWithSameKey.id !== enrollmentId) {
          throw Boom.conflict('Another enrollment already links that student to that group');
        }
      }

      // Update the record in the database
      const [updatedRows] = await Enrollment.update(
        {
          studentId: newEnrollmentData.studentId,
          groupId: newEnrollmentData.groupId,
          enrollmentDate: newEnrollmentData.enrollmentDate,
        },
        {
          where: { id: enrollmentId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Enrollment not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the enrollment in the database' });
    }
  }

  /**
   * Deletes an enrollment record, provided it has no associated
   * certificate or scores.
   *
   * @param {number} enrollmentId
   * @returns {Promise<{status: string}>}
   */
  async deleteOne(enrollmentId) {

    if (!enrollmentId) {
      throw Boom.badRequest('No enrollment identifier was provided');
    }

    try {
      // Verify the enrollment exists before attempting the deletion
      const existingEnrollment = await this._findById(enrollmentId);

      if (!existingEnrollment) {
        throw Boom.notFound('Enrollment not found');
      }

      // Prevent deletion if the enrollment still has an associated
      // certificate or scores, giving a clearer error than the raw
      // RESTRICT constraint from MySQL
      await this._assertNoAssociatedCertificate(enrollmentId);
      await this._assertNoAssociatedScores(enrollmentId);

      // Destroy the record in the database
      const deletedRows = await Enrollment.destroy({
        where: { id: enrollmentId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Enrollment not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the enrollment from the database' });
    }
  }

  /**
   * Retrieves a single enrollment by its id, embedding its related
   * student and group as nested objects.
   *
   * @param {number} enrollmentId
   * @returns {Promise<Object>}
   */
  async listOne(enrollmentId) {

    if (!enrollmentId) {
      throw Boom.badRequest('No enrollment identifier was provided');
    }

    try {
      const theEnrollment = await Enrollment.findOne({
        where: { id: enrollmentId },
        include: EnrollmentServices.CATALOG_INCLUDES,
      });

      if (!theEnrollment) {
        throw Boom.notFound('Enrollment not found');
      }

      return EnrollmentServices._formatEnrollment(theEnrollment);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the enrollment' });
    }
  }

  /**
   * Retrieves all enrollment records, ordered by enrollment date
   * (most recent first), each with its related student and group
   * embedded as nested objects.
   *
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allEnrollments = await Enrollment.findAll({
        order: [['enrollmentDate', 'DESC']],
        include: EnrollmentServices.CATALOG_INCLUDES,
      });

      const records = allEnrollments.map(EnrollmentServices._formatEnrollment);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the enrollments' });
    }
  }

  /**
   * Retrieves every enrollment belonging to a given student, ordered
   * by enrollment date (most recent first). Supports building a
   * student's full academic history across grades and years.
   *
   * @param {number} studentId
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByStudent(studentId) {

    if (!studentId) {
      throw Boom.badRequest('No student identifier was provided');
    }

    try {
      const enrollmentsByStudent = await Enrollment.findAll({
        where: { studentId },
        order: [['enrollmentDate', 'DESC']],
        include: EnrollmentServices.CATALOG_INCLUDES,
      });

      const records = enrollmentsByStudent.map(EnrollmentServices._formatEnrollment);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the enrollments for the given student' });
    }
  }

  /**
   * Retrieves every enrollment belonging to a given group, ordered by
   * enrollment date. Supports listing the roster of a group.
   *
   * @param {number} groupId
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByGroup(groupId) {

    if (!groupId) {
      throw Boom.badRequest('No group identifier was provided');
    }

    try {
      const enrollmentsByGroup = await Enrollment.findAll({
        where: { groupId },
        order: [['enrollmentDate', 'ASC']],
        include: EnrollmentServices.CATALOG_INCLUDES,
      });

      const records = enrollmentsByGroup.map(EnrollmentServices._formatEnrollment);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the enrollments for the given group' });
    }
  }

  /**
   * Retrieves the single enrollment (if any) linking a specific student
   * to a specific group. Useful to check whether a student is already
   * enrolled in a group before attempting a new enrollment.
   *
   * @param {number} studentId
   * @param {number} groupId
   * @returns {Promise<Object>}
   */
  async getByStudentAndGroup(studentId, groupId) {

    if (!studentId || !groupId) {
      throw Boom.badRequest('Both a student identifier and a group identifier must be provided');
    }

    try {
      const theEnrollment = await Enrollment.findOne({
        where: { studentId, groupId },
        include: EnrollmentServices.CATALOG_INCLUDES,
      });

      if (!theEnrollment) {
        throw Boom.notFound('No enrollment was found linking the provided student to the provided group');
      }

      return EnrollmentServices._formatEnrollment(theEnrollment);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the enrollment for the given student and group' });
    }
  }


  // PRIVATE HELPERS (instance)
  // Naming convention: a leading underscore marks a method as
  // internal to this class and not meant to be called from
  // controllers. True '#private' class fields are intentionally
  // avoided to stay compatible with the ecmaVersion 12 (ES2021)
  // parser target declared in .eslintrc.json.


  /**
   * Finds an enrollment by its primary key. Used internally by write
   * operations (updateOne/deleteOne) that only need to check existence,
   * so it intentionally does NOT eager-load the student/group
   * associations — callers that need the formatted, nested shape
   * should go through listOne() instead.
   *
   * @private
   * @param {number} enrollmentId
   * @returns {Promise<Enrollment|null>}
   */
  async _findById(enrollmentId) {
    return Enrollment.findOne({ where: { id: enrollmentId } });
  }

  /**
   * Finds an enrollment by the composite key of student + group. This
   * mirrors the database-level unique index described in the class
   * JSDoc, letting the service surface a clear Boom.conflict before the
   * query ever reaches the database.
   *
   * @private
   * @param {number} studentId
   * @param {number} groupId
   * @returns {Promise<Enrollment|null>}
   */
  async _findByStudentAndGroup(studentId, groupId) {
    return Enrollment.findOne({ where: { studentId, groupId } });
  }

  /**
   * Verifies that a referenced entity (Student or Group) exists.
   *
   * @private
   * @param {import('sequelize').ModelStatic} model
   * @param {number} id
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
   * Ensures an enrollment has no associated certificate before allowing
   * its deletion, since 'certificado' references 'matricula' with
   * onDelete: 'RESTRICT' at the database level (and enrollmentId is
   * unique on Certificate — a reprint reuses the existing record rather
   * than creating a new one, per context.md).
   *
   * @private
   * @param {number} enrollmentId
   * @throws {Boom}
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedCertificate(enrollmentId) {
    const associatedCertificate = await Certificate.findOne({
      where: { enrollmentId }
    });

    if (associatedCertificate) {
      throw Boom.conflict('The enrollment cannot be deleted because it has an associated certificate');
    }
  }

  /**
   * Ensures an enrollment has no associated scores before allowing its
   * deletion, since 'calificacion' references 'matricula' with
   * onDelete: 'RESTRICT' at the database level.
   *
   * @private
   * @param {number} enrollmentId
   * @throws {Boom}
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedScores(enrollmentId) {
    const associatedScore = await Score.findOne({
      where: { enrollmentId }
    });

    if (associatedScore) {
      throw Boom.conflict('The enrollment cannot be deleted because it has associated scores');
    }
  }


  // STATIC UTILITIES
  // Stateless helpers that do not depend on instance data, and are
  // therefore exposed as static methods. The ones prefixed with '_'
  // are intended strictly for internal use within this class (mirroring
  // the instance-method privacy convention), since ecmaVersion 12
  // (ES2021) does not support true private static members without
  // '#' fields.


  /**
   * Sequelize include for the related Student, exposing only the
   * fields needed to identify the student without pulling in the
   * entire record (e.g. address, email).
   *
   * @static
   */
  static STUDENT_INCLUDE = {
    model: Student,
    as: 'student',
    attributes: ['id', 'firstName', 'middleName', 'firstLastName', 'secondLastName', 'documentNumber'],
  };

  /**
   * Sequelize include for the related Group, exposing only the fields
   * needed to identify the group.
   *
   * @static
   */
  static GROUP_INCLUDE = {
    model: Group,
    as: 'group',
    attributes: ['id', 'name', 'year'],
  };

  /**
   * The set of Sequelize includes shared by every read method that
   * needs to embed the related student and group as nested objects
   * rather than raw foreign key integers.
   *
   * @static
   */
  static CATALOG_INCLUDES = [
    EnrollmentServices.STUDENT_INCLUDE,
    EnrollmentServices.GROUP_INCLUDE,
  ];

  /**
   * Reshapes an Enrollment Sequelize instance (with its 'student' and
   * 'group' associations eagerly loaded via CATALOG_INCLUDES) into a
   * plain object where the raw 'studentId'/'groupId' foreign keys are
   * replaced by nested { id, ... } objects.
   *
   * @private
   * @static
   * @param {Enrollment}
   * @returns {Object}
   */
  static _formatEnrollment(enrollment) {
    const { studentId, groupId, student, group, ...rest } = enrollment.toJSON();

    return {
      ...rest,
      student: student ?? null,
      group: group ?? null,
    };
  }
}
