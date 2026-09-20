// Import the Gender data model
import { Gender } from '../db/models/gender.js';
// Import the models that reference Gender, needed to enforce the delete-guard business rules
import { User } from '../db/models/user.js';
import { Student } from '../db/models/student.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Gender (genero) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * 'name' is backed by a fixed MySQL ENUM column (see
 * migrations/20260707174706-gender.cjs), so this service validates
 * incoming values against the same closed set before hitting the
 * database, giving a clearer Boom error than the raw ENUM rejection
 * MySQL would otherwise throw.
 *
 * 'usuario' points to this table with onDelete: 'RESTRICT' (hard
 * constraint), while 'estudiante' points to it with onDelete: 'SET
 * NULL' (soft, since historical students may lack a registered
 * gender). The deletion guard below checks both.
 */
export class GenderServices {

  // ==========================================================
  // PUBLIC METHODS (instance)
  // ==========================================================

  /**
   * Creates a new gender record in the database.
   *
   * @param {Object} newGender
   * @param {string} newGender.name
   * @returns {Promise<{status: string}>}
   */
  async createOne(newGender) {

    try {

      // Validate the name against the closed ENUM set before querying
      GenderServices._assertValidName(newGender.name);

      // Verify a gender with the same name does not already exist
      const existingGender = await this._findByName(newGender.name);

      if (existingGender) {
        throw Boom.conflict('A gender already exists with the provided name');
      }

      // Create the record (id is generated automatically)
      await Gender.create({
        name: newGender.name,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the gender in the database'
      });
    }
  }

  /**
   * Updates an existing gender record.
   *
   * @param {number} genderId - The id of the gender to update.
   * @param {Object} newGenderData - The new data to persist.
   * @param {string} newGenderData.name - The new gender name.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async updateOne(genderId, newGenderData) {

    if (!newGenderData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the gender exists before attempting the update
      const existingGender = await this._findById(genderId);

      if (!existingGender) {
        throw Boom.notFound('Gender not found');
      }

      // If a new name is provided, validate it and verify it is not
      // already used by another gender
      if (newGenderData.name) {
        GenderServices._assertValidName(newGenderData.name);

        const genderWithSameName = await this._findByName(newGenderData.name);

        if (genderWithSameName && genderWithSameName.id !== genderId) {
          throw Boom.conflict('Another gender is already registered with that name');
        }
      }

      // Update the record in the database
      const [updatedRows] = await Gender.update(
        {
          name: newGenderData.name,
        },
        {
          where: { id: genderId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Gender not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the gender in the database' });
    }
  }

  /**
   * Deletes a gender record, provided it has no associated users or students.
   *
   * @param {number} genderId - The id of the gender to delete.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async deleteOne(genderId) {

    if (!genderId) {
      throw Boom.badRequest('No gender identifier was provided');
    }

    try {
      // Verify the gender exists before attempting the deletion
      const existingGender = await this._findById(genderId);

      if (!existingGender) {
        throw Boom.notFound('Gender not found');
      }

      // Prevent deletion if the gender still has associated users,
      // giving a clearer error than the raw RESTRICT constraint from MySQL
      await this._assertNoAssociatedUsers(genderId);

      // Also prevent deletion if it still has associated students. This
      // is a business-rule guard rather than a hard database constraint,
      // since 'estudiante' references 'genero' with SET NULL.
      await this._assertNoAssociatedStudents(genderId);

      // Destroy the record in the database
      const deletedRows = await Gender.destroy({
        where: { id: genderId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Gender not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the gender from the database' });
    }
  }

  /**
   * Retrieves a single gender by its id.
   *
   * @param {number} genderId - The id of the gender to retrieve.
   * @returns {Promise<Gender>} - The gender record.
   */
  async listOne(genderId) {

    if (!genderId) {
      throw Boom.badRequest('No gender identifier was provided');
    }

    try {
      const theGender = await this._findById(genderId);

      if (!theGender) {
        throw Boom.notFound('Gender not found');
      }

      return theGender;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the gender' });
    }
  }

  /**
   * Retrieves all gender records, ordered alphabetically by name.
   *
   * @returns {Promise<{total: number, records: Gender[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allGenders = await Gender.findAll({
        order: [['name', 'ASC']]
      });

      return { total: allGenders.length, records: allGenders };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the genders' });
    }
  }

  /**
   * Retrieves a single gender by its exact name. Since 'name' is backed
   * by a fixed ENUM (a closed, small set of values), an exact lookup is
   * more meaningful here than a partial-text search.
   *
   * @param {string} name - The gender name to search for.
   * @returns {Promise<Gender>} - The matching gender record.
   */
  async listByName(name) {

    if (!name) {
      throw Boom.badRequest('No gender name was provided');
    }

    try {
      const theGender = await this._findByName(name);

      if (!theGender) {
        throw Boom.notFound('Gender not found with the provided name');
      }

      return theGender;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the gender by its name' });
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
   * Finds a gender by its primary key.
   *
   * @private
   * @param {number} genderId - The id of the gender to find.
   * @returns {Promise<Gender|null>} - The gender record, or null if not found.
   */
  async _findById(genderId) {
    return Gender.findOne({ where: { id: genderId } });
  }

  /**
   * Finds a gender by its exact name.
   *
   * @private
   * @param {string} name - The gender name to find.
   * @returns {Promise<Gender|null>} - The gender record, or null if not found.
   */
  async _findByName(name) {
    return Gender.findOne({ where: { name } });
  }

  /**
   * Ensures a gender has no associated users before allowing its
   * deletion, since 'usuario' references 'genero' with
   * onDelete: 'RESTRICT' at the database level.
   *
   * @private
   * @param {number} genderId - The id of the gender to check.
   * @throws {Boom} - A conflict error when dependent users exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedUsers(genderId) {
    const associatedUser = await User.findOne({
      where: { genderId }
    });

    if (associatedUser) {
      throw Boom.conflict('The gender cannot be deleted because it has associated users');
    }
  }

  /**
   * Ensures a gender has no associated students before allowing its
   * deletion. This is a business-rule guard rather than a hard database
   * constraint, since 'estudiante' references 'genero' with
   * onDelete: 'SET NULL'.
   *
   * @private
   * @param {number} genderId - The id of the gender to check.
   * @throws {Boom} - A conflict error when dependent students exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedStudents(genderId) {
    const associatedStudent = await Student.findOne({
      where: { genderId }
    });

    if (associatedStudent) {
      throw Boom.conflict('The gender cannot be deleted because it has associated students');
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
   * The closed set of gender names allowed by the 'nombre_genero' ENUM
   * column.
   *
   * @static
   * @type {string[]}
   */
  static VALID_NAMES = ['Masculino', 'Femenino', 'No binario', 'Otro', 'Prefiero no decirlo'];

  /**
   * Validates that a name belongs to the closed set of gender names,
   * throwing a clear Boom error before the query ever reaches the
   * database.
   *
   * @private
   * @static
   * @param {string} name - The gender name to validate.
   * @throws {Boom} - A bad request error when the name is not allowed.
   * @returns {void}
   */
  static _assertValidName(name) {
    if (!GenderServices.VALID_NAMES.includes(name)) {
      throw Boom.badRequest(`The gender name must be one of: ${GenderServices.VALID_NAMES.join(', ')}`);
    }
  }
}
