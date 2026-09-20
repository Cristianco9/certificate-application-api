// Import the Student data model
import { Student } from '../db/models/student.js';
// Import related catalog models to embed FK data as nested objects
import { Municipality } from '../db/models/municipality.js';
import { DocumentType } from '../db/models/documentType.js';
import { Gender } from '../db/models/gender.js';
// Import the Enrollment model to enforce the delete-guard business rule
import { Enrollment } from '../db/models/enrollment.js';
// Import the Sequelize operators to build advanced query conditions
import { Op } from 'sequelize';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Student (estudiante) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * Students can be identified either by a document number (when available)
 * or by a composite key of full name + birth date (for historical students
 * without a registered document). The database enforces this via a unique
 * index on (firstName, middleName, firstLastName, secondLastName, birthDate).
 *
 * Read operations return students with their related catalog records
 * (municipality, document type, gender) embedded as nested objects,
 * rather than raw foreign key integers.
 */
export class StudentServices {


  /**
   * Creates a new student record in the database.
   *
   * @param {Object} newStudent
   * @param {string} newStudent.firstName
   * @param {string} [newStudent.middleName]
   * @param {string} newStudent.firstLastName
   * @param {string} [newStudent.secondLastName]
   * @param {string} [newStudent.documentNumber]
   * @param {string} newStudent.birthDate
   * @param {number|string} newStudent.municipalityId
   * @param {number|string} [newStudent.documentTypeId]
   * @param {number|string} [newStudent.genderId]
   * @param {string} [newStudent.address]
   * @param {string} [newStudent.email]
   * @returns {Promise<{status: string}>}
   */
  async createOne(newStudent) {

    try {
      // Normalize optional fields: trim strings, convert empty to null
      const normalized = StudentServices._normalizeStudentData(newStudent);

      // Verify the municipality exists (required)
      await this._assertExists(Municipality, normalized.municipalityId, 'Municipality');

      // If documentTypeId is provided, verify it exists
      if (normalized.documentTypeId) {
        await this._assertExists(DocumentType, normalized.documentTypeId, 'DocumentType');
      }

      // If genderId is provided, verify it exists
      if (normalized.genderId) {
        await this._assertExists(Gender, normalized.genderId, 'Gender');
      }

      // If document number is provided, verify it's unique
      if (normalized.documentNumber) {
        const existingByDoc = await this._findByDocumentNumber(normalized.documentNumber);
        if (existingByDoc) {
          throw Boom.conflict('A student with this document number already exists');
        }
      } else {
        // If no document number, verify the composite name+birthdate is unique
        const existingByNameAndBirth = await this._findByNameAndBirth(
          normalized.firstName,
          normalized.middleName,
          normalized.firstLastName,
          normalized.secondLastName,
          normalized.birthDate
        );
        if (existingByNameAndBirth) {
          throw Boom.conflict('A student with the same full name and birth date already exists');
        }
      }

      // Create the record
      await Student.create({
        firstName: normalized.firstName,
        middleName: normalized.middleName,
        firstLastName: normalized.firstLastName,
        secondLastName: normalized.secondLastName,
        documentNumber: normalized.documentNumber,
        birthDate: normalized.birthDate,
        municipalityId: normalized.municipalityId,
        documentTypeId: normalized.documentTypeId,
        genderId: normalized.genderId,
        address: normalized.address,
        email: normalized.email,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the student in the database'
      });
    }
  }

  /**
   * Updates an existing student record.
   *
   * @param {number|string} studentId
   * @param {Object} newStudentData
   * @param {string} [newStudentData.firstName]
   * @param {string} [newStudentData.middleName]
   * @param {string} [newStudentData.firstLastName]
   * @param {string} [newStudentData.secondLastName]
   * @param {string} [newStudentData.documentNumber]
   * @param {string} [newStudentData.birthDate]
   * @param {number|string} [newStudentData.municipalityId]
   * @param {number|string} [newStudentData.documentTypeId]
   * @param {number|string} [newStudentData.genderId]
   * @param {string} [newStudentData.address]
   * @param {string} [newStudentData.email]
   * @returns {Promise<{status: string}>}
   */
  async updateOne(studentId, newStudentData) {

    if (!newStudentData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the student exists before attempting the update
      const existingStudent = await this._findById(studentId);

      if (!existingStudent) {
        throw Boom.notFound('Student not found');
      }

      // Normalize incoming data
      const normalized = StudentServices._normalizeStudentData(newStudentData, true);

      // If municipalityId is provided, verify it exists
      if (normalized.municipalityId !== undefined) {
        await this._assertExists(Municipality, normalized.municipalityId, 'Municipality');
      }

      // If documentTypeId is provided, verify it exists
      if (normalized.documentTypeId !== undefined) {
        await this._assertExists(DocumentType, normalized.documentTypeId, 'DocumentType');
      }

      // If genderId is provided, verify it exists
      if (normalized.genderId !== undefined) {
        await this._assertExists(Gender, normalized.genderId, 'Gender');
      }

      // If document number is provided and changed, verify uniqueness
      if (normalized.documentNumber !== undefined) {
        if (normalized.documentNumber) {
          const existingByDoc = await this._findByDocumentNumber(normalized.documentNumber);
          if (existingByDoc && existingByDoc.id !== Number(studentId)) {
            throw Boom.conflict('Another student already has this document number');
          }
        } else {
          // If document number is being set to null, verify composite uniqueness
          const existingByNameAndBirth = await this._findByNameAndBirth(
            normalized.firstName ?? existingStudent.firstName,
            normalized.middleName ?? existingStudent.middleName,
            normalized.firstLastName ?? existingStudent.firstLastName,
            normalized.secondLastName ?? existingStudent.secondLastName,
            normalized.birthDate ?? existingStudent.birthDate
          );
          if (existingByNameAndBirth && existingByNameAndBirth.id !== Number(studentId)) {
            throw Boom.conflict('Another student already has the same full name and birth date');
          }
        }
      } else if (!existingStudent.documentNumber) {
        // If document number is not being updated and the student currently has no document,
        // verify that name+birthdate uniqueness is still valid (in case name or birthdate changed)
        const nameChanged = normalized.firstName !== undefined || normalized.middleName !== undefined ||
                           normalized.firstLastName !== undefined || normalized.secondLastName !== undefined;
        const birthChanged = normalized.birthDate !== undefined;
        if (nameChanged || birthChanged) {
          const existingByNameAndBirth = await this._findByNameAndBirth(
            normalized.firstName ?? existingStudent.firstName,
            normalized.middleName ?? existingStudent.middleName,
            normalized.firstLastName ?? existingStudent.firstLastName,
            normalized.secondLastName ?? existingStudent.secondLastName,
            normalized.birthDate ?? existingStudent.birthDate
          );
          if (existingByNameAndBirth && existingByNameAndBirth.id !== Number(studentId)) {
            throw Boom.conflict('Another student already has the same full name and birth date');
          }
        }
      }

      // Build update object (only fields that are provided)
      const updateData = {};
      if (normalized.firstName !== undefined) updateData.firstName = normalized.firstName;
      if (normalized.middleName !== undefined) updateData.middleName = normalized.middleName;
      if (normalized.firstLastName !== undefined) updateData.firstLastName = normalized.firstLastName;
      if (normalized.secondLastName !== undefined) updateData.secondLastName = normalized.secondLastName;
      if (normalized.documentNumber !== undefined) updateData.documentNumber = normalized.documentNumber;
      if (normalized.birthDate !== undefined) updateData.birthDate = normalized.birthDate;
      if (normalized.municipalityId !== undefined) updateData.municipalityId = normalized.municipalityId;
      if (normalized.documentTypeId !== undefined) updateData.documentTypeId = normalized.documentTypeId;
      if (normalized.genderId !== undefined) updateData.genderId = normalized.genderId;
      if (normalized.address !== undefined) updateData.address = normalized.address;
      if (normalized.email !== undefined) updateData.email = normalized.email;

      // Update the record in the database
      const [updatedRows] = await Student.update(
        updateData,
        {
          where: { id: studentId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Student not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the student in the database' });
    }
  }

  /**
   * Deletes a student record, provided it has no associated enrollments.
   *
   * @param {number|string} studentId - The id of the student to delete.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async deleteOne(studentId) {

    if (!studentId) {
      throw Boom.badRequest('No student identifier was provided');
    }

    try {
      // Verify the student exists before attempting the deletion
      const existingStudent = await this._findById(studentId);

      if (!existingStudent) {
        throw Boom.notFound('Student not found');
      }

      // Prevent deletion if the student still has associated enrollments,
      // giving a clearer error than the raw RESTRICT/SET NULL constraint from MySQL
      await this._assertNoAssociatedEnrollments(studentId);

      // Destroy the record in the database
      const deletedRows = await Student.destroy({
        where: { id: studentId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Student not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the student from the database' });
    }
  }

  /**
   * Retrieves a single student by its id, embedding related catalog records
   * as nested objects.
   *
   * @param {number|string} studentId - The id of the student to retrieve.
   * @returns {Promise<Object>} - The formatted student record.
   */
  async listOne(studentId) {

    if (!studentId) {
      throw Boom.badRequest('No student identifier was provided');
    }

    try {
      const theStudent = await Student.findOne({
        where: { id: studentId },
        include: StudentServices.CATALOG_INCLUDES,
      });

      if (!theStudent) {
        throw Boom.notFound('Student not found');
      }

      return StudentServices._formatStudent(theStudent);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the student' });
    }
  }

  /**
   * Retrieves all student records, ordered by first name and last name,
   * each with their related catalog records embedded.
   *
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allStudents = await Student.findAll({
        order: [
          ['firstName', 'ASC'],
          ['firstLastName', 'ASC']
        ],
        include: StudentServices.CATALOG_INCLUDES,
      });

      const records = allStudents.map(StudentServices._formatStudent);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the students' });
    }
  }

  /**
   * Searches students whose first name or last name partially matches
   * the given text. Supports the multi-criteria search requirement.
   *
   * @param {string} partialName - The partial name to search for.
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByPartialName(partialName) {

    if (!partialName) {
      throw Boom.badRequest('No search text was provided');
    }

    try {
      const matchingStudents = await Student.findAll({
        where: {
          [Op.or]: [
            { firstName: { [Op.like]: `%${partialName}%` } },
            { firstLastName: { [Op.like]: `%${partialName}%` } },
          ]
        },
        order: [
          ['firstName', 'ASC'],
          ['firstLastName', 'ASC']
        ],
        include: StudentServices.CATALOG_INCLUDES,
      });

      const records = matchingStudents.map(StudentServices._formatStudent);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to search the students' });
    }
  }

  /**
   * Retrieves a student by their exact document number.
   *
   * @param {string} documentNumber - The document number to search for.
   * @returns {Promise<Object>} - The formatted student record.
   */
  async listByDocumentNumber(documentNumber) {

    if (!documentNumber) {
      throw Boom.badRequest('No document number was provided');
    }

    try {
      const theStudent = await Student.findOne({
        where: { documentNumber },
        include: StudentServices.CATALOG_INCLUDES,
      });

      if (!theStudent) {
        throw Boom.notFound('Student not found with the provided document number');
      }

      return StudentServices._formatStudent(theStudent);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the student by document number' });
    }
  }

  /**
   * Retrieves all students belonging to a given municipality.
   *
   * @param {number|string} municipalityId
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByMunicipality(municipalityId) {

    if (!municipalityId) {
      throw Boom.badRequest('No municipality identifier was provided');
    }

    try {
      const students = await Student.findAll({
        where: { municipalityId },
        order: [
          ['firstName', 'ASC'],
          ['firstLastName', 'ASC']
        ],
        include: StudentServices.CATALOG_INCLUDES,
      });

      const records = students.map(StudentServices._formatStudent);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find students for the given municipality' });
    }
  }

  /**
   * Retrieves all students by a specific document type.
   *
   * @param {number|string} documentTypeId - The id of the document type.
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByDocumentType(documentTypeId) {

    if (!documentTypeId) {
      throw Boom.badRequest('No document type identifier was provided');
    }

    try {
      const students = await Student.findAll({
        where: { documentTypeId },
        order: [
          ['firstName', 'ASC'],
          ['firstLastName', 'ASC']
        ],
        include: StudentServices.CATALOG_INCLUDES,
      });

      const records = students.map(StudentServices._formatStudent);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find students for the given document type' });
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
   * Finds a student by its primary key.
   *
   * @private
   * @param {number|string} studentId
   * @returns {Promise<Student|null>}
   */
  async _findById(studentId) {
    return Student.findOne({ where: { id: studentId } });
  }

  /**
   * Finds a student by document number (exact match).
   *
   * @private
   * @param {string} documentNumber
   * @returns {Promise<Student|null>}
   */
  async _findByDocumentNumber(documentNumber) {
    return Student.findOne({ where: { documentNumber } });
  }

  /**
   * Finds a student by the composite key of full name + birth date.
   * Used for students without a document number.
   *
   * @private
   * @param {string} firstName
   * @param {string|null} middleName
   * @param {string} firstLastName
   * @param {string|null} secondLastName
   * @param {string} birthDate
   * @returns {Promise<Student|null>}
   */
  async _findByNameAndBirth(firstName, middleName, firstLastName, secondLastName, birthDate) {
    return Student.findOne({
      where: {
        firstName,
        middleName,
        firstLastName,
        secondLastName,
        birthDate
      }
    });
  }

  /**
   * Ensures a student has no associated enrollments before allowing
   * its deletion, since 'matricula' references 'estudiante' with
   * onDelete: 'SET NULL' at the database level. This is a
   * business-rule guard to prevent accidental deletion.
   *
   * @private
   * @param {number|string} studentId
   * @throws {Boom}
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedEnrollments(studentId) {
    const associatedEnrollment = await Enrollment.findOne({
      where: { studentId }
    });

    if (associatedEnrollment) {
      throw Boom.conflict('The student cannot be deleted because they have associated enrollments');
    }
  }

  /**
   * Verifies that a referenced entity (e.g., Municipality) exists.
   * Throws a notFound error if the record does not exist.
   *
   * @private
   * @param {Model} model
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
   * The Sequelize include shared by every read method that needs to
   * embed the related catalog records as nested objects rather than
   * raw foreign key integers.
   *
   * @static
   */
  static CATALOG_INCLUDES = [
    { model: Municipality, as: 'municipality', attributes: ['id', 'name'] },
    { model: DocumentType, as: 'documentType', attributes: ['id', 'name'] },
    { model: Gender, as: 'gender', attributes: ['id', 'name'] },
  ];

  /**
   * Reshapes a Student Sequelize instance (with its related catalog
   * associations eagerly loaded via CATALOG_INCLUDES) into a plain
   * object where the raw FK ids are replaced by nested { id, name } objects.
   *
   * @private
   * @static
   * @param {Student} student
   * @returns {Object}
   */
  static _formatStudent(student) {
    const {
      municipalityId,
      documentTypeId,
      genderId,
      municipality,
      documentType,
      gender,
      ...rest
    } = student.toJSON();

    return {
      ...rest,
      municipality: municipality ?? null,
      documentType: documentType ?? null,
      gender: gender ?? null,
    };
  }

  /**
   * Normalizes student data: trims strings, converts empty strings to null
   * for optional fields, and ensures consistent handling of foreign keys.
   *
   * @private
   * @static
   * @param {Object} data
   * @param {boolean} [isUpdate=false]
   * @returns {Object}
   */
  static _normalizeStudentData(data, isUpdate = false) {
    const normalized = {};

    // Helper: trim and convert empty string to null for optional fields
    const normalizeString = (value) => {
      if (value === undefined || value === null) return undefined;
      const trimmed = String(value).trim();
      return trimmed === '' ? null : trimmed;
    };

    // Required fields (cannot be null)
    if (data.firstName !== undefined) normalized.firstName = normalizeString(data.firstName) ?? undefined;
    if (data.firstLastName !== undefined) normalized.firstLastName = normalizeString(data.firstLastName) ?? undefined;
    if (data.birthDate !== undefined) normalized.birthDate = data.birthDate; // date is validated by Joi

    // Optional fields (can be null)
    if (data.middleName !== undefined) normalized.middleName = normalizeString(data.middleName);
    if (data.secondLastName !== undefined) normalized.secondLastName = normalizeString(data.secondLastName);
    if (data.documentNumber !== undefined) normalized.documentNumber = normalizeString(data.documentNumber);
    if (data.address !== undefined) normalized.address = normalizeString(data.address);
    if (data.email !== undefined) normalized.email = normalizeString(data.email);

    // Foreign keys: convert to number if provided, else undefined
    const normalizeId = (value) => {
      if (value === undefined || value === null || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    };

    if (data.municipalityId !== undefined) normalized.municipalityId = normalizeId(data.municipalityId);
    if (data.documentTypeId !== undefined) normalized.documentTypeId = normalizeId(data.documentTypeId);
    if (data.genderId !== undefined) normalized.genderId = normalizeId(data.genderId);

    return normalized;
  }
}
