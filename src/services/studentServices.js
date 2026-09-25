// Import the Student data model
import { Student } from '../db/models/student.js';
// Import related catalog models to embed FK data as nested objects
import { Municipality } from '../db/models/municipality.js';
import { DocumentType } from '../db/models/documentType.js';
import { Gender } from '../db/models/gender.js';
import { Score } from '../db/models/score.js';
import { Subject } from '../db/models/subject.js';
import { Group } from '../db/models/group.js';
import { Grade } from '../db/models/grade.js';
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

  /**
   * Retrieves every score recorded for a student within a specific
   * academic year.
   *
   * Equivalent of:
   *   SELECT g.nombre grado, gr.nombre grupo, gr.anio, asig.nombre asignatura,
   *          asig.ih, c.nota_definitiva, c.valoracion, c.nivelacion
   *   FROM calificacion c
   *   JOIN asignatura asig ON c.id_asignatura = asig.id_asignatura
   *   JOIN matricula m ON c.id_matricula = m.id_matricula
   *   JOIN grupo gr ON m.id_grupo = gr.id_grupo
   *   JOIN grado g ON gr.id_grado = g.id_grado
   *   WHERE m.id_estudiante = ? AND gr.anio = ?
   *
   * Field mapping (this schema has no separate nota_definitiva/
   * valoracion/nivelacion columns): 'originalScore' + 'scoreType'
   * cover nota_definitiva/valoracion, 'remedialScore' covers
   * nivelacion, and Subject.hourlyIntensity covers 'ih'.
   *
   * @param {number|string} studentId
   * @param {number|string} year - The academic year (Group.year).
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listScoresByStudentAndYear(studentId, year) {
    if (!studentId || !year) {
      throw Boom.badRequest('Both a student identifier and an academic year must be provided');
    }

    try {
      await this._assertExists(Student, studentId, 'Student');

      const scores = await Score.findAll({
        include: StudentServices._buildScoreIncludes({ studentId, year }),
        order: [
          [{ model: Enrollment, as: 'enrollment' }, { model: Group, as: 'group' }, { model: Grade, as: 'grade' }, 'name', 'ASC'],
          [{ model: Subject, as: 'subject' }, 'name', 'ASC'],
        ],
      });

      const records = scores.map(StudentServices._formatScoreRow);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the scores for the given student and year' });
    }
  }

  /**
   * Retrieves a student's full academic history across every year
   * they have been enrolled, ordered by year, grade and subject.
   *
   * Equivalent of:
   *   SELECT gr.anio, g.nombre grado, gr.nombre grupo, asig.nombre asignatura,
   *          asig.ih, c.nota_definitiva, c.valoracion, c.nivelacion
   *   FROM calificacion c
   *   JOIN asignatura asig ON c.id_asignatura = asig.id_asignatura
   *   JOIN matricula m ON c.id_matricula = m.id_matricula
   *   JOIN grupo gr ON m.id_grupo = gr.id_grupo
   *   JOIN grado g ON gr.id_grado = g.id_grado
   *   WHERE m.id_estudiante = ?
   *   ORDER BY gr.anio, g.nombre, asig.nombre
   *
   * @param {number|string} studentId
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async getAcademicHistory(studentId) {
    if (!studentId) {
      throw Boom.badRequest('No student identifier was provided');
    }

    try {
      await this._assertExists(Student, studentId, 'Student');

      const scores = await Score.findAll({
        include: StudentServices._buildScoreIncludes({ studentId }),
        order: [
          [{ model: Enrollment, as: 'enrollment' }, { model: Group, as: 'group' }, 'year', 'ASC'],
          [{ model: Enrollment, as: 'enrollment' }, { model: Group, as: 'group' }, { model: Grade, as: 'grade' }, 'name', 'ASC'],
          [{ model: Subject, as: 'subject' }, 'name', 'ASC'],
        ],
      });

      const records = scores.map(StudentServices._formatScoreRow);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to build the academic history for the given student' });
    }
  }

  /**
   * Retrieves the distinct academic years a student has been enrolled
   * in, each with its grade and group.
   *
   * Equivalent of:
   *   SELECT DISTINCT gr.anio, g.nombre grado, gr.nombre grupo
   *   FROM matricula m
   *   JOIN grupo gr ON m.id_grupo = gr.id_grupo
   *   JOIN grado g ON gr.id_grado = g.id_grado
   *   WHERE m.id_estudiante = ?
   *   ORDER BY gr.anio
   *
   * @param {number|string} studentId
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listCourseYears(studentId) {
    if (!studentId) {
      throw Boom.badRequest('No student identifier was provided');
    }

    try {
      await this._assertExists(Student, studentId, 'Student');

      const enrollments = await Enrollment.findAll({
        where: { studentId },
        attributes: ['id'],
        include: [
          {
            model: Group,
            as: 'group',
            required: true,
            attributes: ['id', 'name', 'year'],
            include: [{ model: Grade, as: 'grade', attributes: ['id', 'name'] }],
          },
        ],
        order: [[{ model: Group, as: 'group' }, 'year', 'ASC']],
      });

      // De-duplicate on year+grade+group, mirroring SELECT DISTINCT.
      // Each enrollment already maps to one group/grade/year, but this
      // guards against a future data shape allowing more than one
      // enrollment per year for the same student.
      const seen = new Set();
      const records = [];

      for (const enrollment of enrollments) {
        const group = enrollment.group;
        if (!group) continue;

        const key = `${group.year}-${group.grade?.id}-${group.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        records.push({
          year: group.year,
          grade: group.grade ? { id: group.grade.id, name: group.grade.name } : null,
          group: { id: group.id, name: group.name },
        });
      }

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the academic years for the given student' });
    }
  }

  /**
   * Retrieves every score for a student within a specific grade
   * (across all years/groups the student was enrolled in that grade),
   * embedding the student's name.
   *
   * Equivalent of:
   *   SELECT e.nombres, e.apellidos, g.nombre grado, gr.nombre grupo, gr.anio,
   *          a.nombre asignatura, a.ih, c.nota_definitiva, c.valoracion, c.nivelacion
   *   FROM calificacion c
   *   JOIN asignatura a ON c.id_asignatura = a.id_asignatura
   *   JOIN matricula m ON c.id_matricula = m.id_matricula
   *   JOIN estudiante e ON m.id_estudiante = e.id_estudiante
   *   JOIN grupo gr ON m.id_grupo = gr.id_grupo
   *   JOIN grado g ON gr.id_grado = g.id_grado
   *   WHERE e.id_estudiante = ? AND g.nombre = ?
   *   ORDER BY a.nombre
   *
   * @param {number|string} studentId
   * @param {string} gradeName - Exact grade name (ENUM, e.g. 'Séptimo').
   * @returns {Promise<{total: number, records: Object[]}>}
   */
  async listScoresByStudentAndGrade(studentId, gradeName) {
    if (!studentId || !gradeName) {
      throw Boom.badRequest('Both a student identifier and a grade name must be provided');
    }

    try {
      const theStudent = await this._findById(studentId);

      if (!theStudent) {
        throw Boom.notFound('Student not found');
      }

      const scores = await Score.findAll({
        include: StudentServices._buildScoreIncludes({ studentId, gradeName }),
        order: [[{ model: Subject, as: 'subject' }, 'name', 'ASC']],
      });

      const records = scores.map((score) => ({
        ...StudentServices._formatScoreRow(score),
        student: {
          id: theStudent.id,
          firstName: theStudent.firstName,
          firstLastName: theStudent.firstLastName,
        },
      }));

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the scores for the given student and grade' });
    }
  }

  /**
   * Computes a lightweight summary (subject count and, when every
   * score is numeric, the arithmetic average) for a student in a
   * specific academic year. Not a raw-SQL equivalent — this is a
   * building block for the certificate-generation feature described
   * as a known gap in AGENTS.md §10 (a "boletín"/report-card view
   * needs exactly this kind of rollup before it can render a summary
   * line per year).
   *
   * @param {number|string} studentId
   * @param {number|string} year
   * @returns {Promise<{year: number, subjectCount: number, numericAverage: number|null}>}
   */
  async getYearSummary(studentId, year) {
    const { records } = await this.listScoresByStudentAndYear(studentId, year);

    const numericScores = records
      .filter((row) => row.scoreType === 'NUMERICA')
      .map((row) => parseFloat(row.originalScore))
      .filter((value) => !Number.isNaN(value));

    const numericAverage = numericScores.length
      ? Math.round((numericScores.reduce((sum, value) => sum + value, 0) / numericScores.length) * 10) / 10
      : null;

    return {
      year: Number(year),
      subjectCount: records.length,
      numericAverage,
    };
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

  /**
   * Builds the Score -> Subject / Score -> Enrollment -> Group -> Grade
   * include tree shared by every academic-history read method above.
   * Filters are applied at the level they belong to (studentId on
   * Enrollment, year on Group, gradeName on Grade) so unfiltered calls
   * (e.g. getAcademicHistory) still return every row.
   *
   * @private
   * @static
   */
  static _buildScoreIncludes({ studentId, year, gradeName } = {}) {
    return [
      { model: Subject, as: 'subject', attributes: ['id', 'name', 'hourlyIntensity'] },
      {
        model: Enrollment,
        as: 'enrollment',
        required: true,
        attributes: ['id', 'enrollmentDate'],
        where: studentId ? { studentId } : undefined,
        include: [
          {
            model: Group,
            as: 'group',
            required: true,
            attributes: ['id', 'name', 'year'],
            where: year ? { year } : undefined,
            include: [
              {
                model: Grade,
                as: 'grade',
                required: true,
                attributes: ['id', 'name'],
                where: gradeName ? { name: gradeName } : undefined,
              },
            ],
          },
        ],
      },
    ];
  }

  /**
   * Flattens a Score instance (with SUBJECT/ENROLLMENT/GROUP/GRADE
   * eagerly loaded via _buildScoreIncludes) into a report-row shape.
   *
   * @private
   * @static
   */
  static _formatScoreRow(score) {
    const plain = score.toJSON();
    const group = plain.enrollment?.group ?? null;
    const grade = group?.grade ?? null;
    const subject = plain.subject ?? null;

    return {
      year: group?.year ?? null,
      grade: grade ? { id: grade.id, name: grade.name } : null,
      group: group ? { id: group.id, name: group.name } : null,
      subject: subject
        ? { id: subject.id, name: subject.name, hourlyIntensity: subject.hourlyIntensity }
        : null,
      originalScore: plain.originalScore,
      scoreType: plain.scoreType,
      remedialScore: plain.remedialScore,
      enrollmentId: plain.enrollment?.id ?? null,
    };
  }
}
