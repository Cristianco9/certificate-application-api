// Import the Grade data model
import { Grade } from '../db/models/grade.js';
// Import the Group model to enforce the delete-guard business rule
import { Group } from '../db/models/group.js';
// Import the Sequelize operators to build advanced query conditions
import { Op } from 'sequelize';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Grade (grado) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * 'name' is backed by a fixed MySQL ENUM column (see
 * migrations/20260707181822-grade.cjs), so this service validates
 * incoming values against the same closed set before hitting the
 * database, giving a clearer Boom error than the raw ENUM rejection
 * MySQL would otherwise throw.
 */
export class GradeServices {

  // ==========================================================
  // PUBLIC METHODS (instance)
  // ==========================================================

  /**
   * Creates a new grade record in the database.
   *
   * @param {Object} newGrade
   * @param {string} newGrade.name
   * @param {string} newGrade.description
   * @returns {Promise<{status: string}>}
   */
  async createOne(newGrade) {

    try {

      // Validate the name against the closed ENUM set before querying
      GradeServices._assertValidName(newGrade.name);

      // Verify a grade with the same name does not already exist
      const existingGradeByName = await this._findByName(newGrade.name);

      if (existingGradeByName) {
        throw Boom.conflict('A grade already exists with the provided name');
      }

      // Create the record (id is generated automatically)
      await Grade.create({
        name: newGrade.name,
        description: newGrade.description,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the grade in the database'
      });
    }
  }

  /**
   * Updates an existing grade record.
   *
   * @param {number} gradeId - The id of the grade to update.
   * @param {Object} newGradeData - The new data to persist.
   * @param {string} [newGradeData.name] - The new grade name.
   * @param {string} [newGradeData.description] - The new grade description.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async updateOne(gradeId, newGradeData) {

    if (!newGradeData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the grade exists before attempting the update
      const existingGrade = await this._findById(gradeId);

      if (!existingGrade) {
        throw Boom.notFound('Grade not found');
      }

      // If a new name is provided, validate it and verify it is not
      // already used by another grade
      if (newGradeData.name) {
        GradeServices._assertValidName(newGradeData.name);

        const gradeWithSameName = await this._findByName(newGradeData.name);

        if (gradeWithSameName && gradeWithSameName.id !== gradeId) {
          throw Boom.conflict('Another grade is already registered with that name');
        }
      }

      // Update the record in the database
      const [updatedRows] = await Grade.update(
        {
          name: newGradeData.name,
          description: newGradeData.description,
        },
        {
          where: { id: gradeId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Grade not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the grade in the database' });
    }
  }

  /**
   * Deletes a grade record, provided it has no associated groups.
   * Although 'grupo' references 'grado' with onDelete: 'SET NULL'
   * (so the database itself would not block this operation), deleting
   * a grade that still has groups pointing to it would silently strip
   * that classification from active groups. This business rule enforces
   * the safer behavior of requiring groups to be reassigned first.
   *
   * @param {number} gradeId - The id of the grade to delete.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async deleteOne(gradeId) {

    if (!gradeId) {
      throw Boom.badRequest('No grade identifier was provided');
    }

    try {
      // Verify the grade exists before attempting the deletion
      const existingGrade = await this._findById(gradeId);

      if (!existingGrade) {
        throw Boom.notFound('Grade not found');
      }

      // Prevent deletion if the grade still has associated groups
      await this._assertNoAssociatedGroups(gradeId);

      // Destroy the record in the database
      const deletedRows = await Grade.destroy({
        where: { id: gradeId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Grade not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the grade from the database' });
    }
  }

  /**
   * Retrieves a single grade by its id.
   *
   * @param {number} gradeId - The id of the grade to retrieve.
   * @returns {Promise<Grade>} - The grade record.
   */
  async listOne(gradeId) {

    if (!gradeId) {
      throw Boom.badRequest('No grade identifier was provided');
    }

    try {
      const theGrade = await this._findById(gradeId);

      if (!theGrade) {
        throw Boom.notFound('Grade not found');
      }

      return theGrade;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the grade' });
    }
  }

 /**
   * Retrieves all grade records, ordered by 'name'. Because 'name' is a
   * MySQL ENUM declared in curricular order ('Primero'...'Undécimo'),
   * an ORDER BY on this column sorts by the ENUM's internal index rather
   * than alphabetically, which conveniently yields the natural grade
   * sequence for free.
   *
   * @returns {Promise<{total: number, records: Grade[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allGrades = await Grade.findAll({
        order: [['name', 'ASC']]
      });

      return { total: allGrades.length, records: allGrades };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the grades' });
    }
  }

  /**
   * Retrieves a single grade by its exact name. Since 'name' is backed
   * by a fixed ENUM (a closed, small set of values), an exact lookup is
   * more meaningful here than a partial-text search.
   *
   * @param {string} name - The grade name to search for.
   * @returns {Promise<Grade>} - The matching grade record.
   */
  async listByName(name) {

    if (!name) {
      throw Boom.badRequest('No grade name was provided');
    }

    try {
      const theGrade = await this._findByName(name);

      if (!theGrade) {
        throw Boom.notFound('Grade not found with the provided name');
      }

      return theGrade;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the grade by its name' });
    }
  }

  /**
   * Searches grades whose description partially matches the given text.
   * Unlike 'name', 'description' is free text (STRING(50)), so a
   * partial-text search is meaningful here.
   *
   * @param {string} partialDescription - The partial description to search for.
   * @returns {Promise<{total: number, records: Grade[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByPartialDescription(partialDescription) {

    if (!partialDescription) {
      throw Boom.badRequest('No search text was provided');
    }

    try {
      const matchingGrades = await Grade.findAll({
        where: {
          description: { [Op.like]: `%${partialDescription}%` }
        },
        order: [['name', 'ASC']]
      });

      return { total: matchingGrades.length, records: matchingGrades };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to search the grades' });
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
   * Finds a grade by its primary key.
   *
   * @private
   * @param {number} gradeId - The id of the grade to find.
   * @returns {Promise<Grade|null>} - The grade record, or null if not found.
   */
  async _findById(gradeId) {
    return Grade.findOne({ where: { id: gradeId } });
  }

  /**
   * Finds a grade by its exact name.
   *
   * @private
   * @param {string} name - The grade name to find.
   * @returns {Promise<Grade|null>} - The grade record, or null if not found.
   */
  async _findByName(name) {
    return Grade.findOne({ where: { name } });
  }

  /**
   * Ensures a grade has no associated groups before allowing its
   * deletion. This is a business-rule guard rather than a hard database
   * constraint, since 'grupo' references 'grado' with onDelete: 'SET NULL'.
   *
   * @private
   * @param {number} gradeId - The id of the grade to check.
   * @throws {Boom} - A conflict error when dependent groups exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedGroups(gradeId) {
    const associatedGroup = await Group.findOne({
      where: { gradeId }
    });

    if (associatedGroup) {
      throw Boom.conflict('The grade cannot be deleted because it has associated groups');
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
   * The closed set of grade names allowed by the 'nombre_grado' ENUM
   * column, kept in curricular order.
   *
   * @static
   * @type {string[]}
   */
  static VALID_NAMES = [
    'Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto',
    'Séptimo', 'Octavo', 'Noveno', 'Décimo', 'Undécimo',
  ];

  /**
   * Validates that a name belongs to the closed set of grade names,
   * throwing a clear Boom error before the query ever reaches the
   * database.
   *
   * @private
   * @static
   * @param {string} name - The grade name to validate.
   * @throws {Boom} - A bad request error when the name is not allowed.
   * @returns {void}
   */
  static _assertValidName(name) {
    if (!GradeServices.VALID_NAMES.includes(name)) {
      throw Boom.badRequest(`The grade name must be one of: ${GradeServices.VALID_NAMES.join(', ')}`);
    }
  }
}
