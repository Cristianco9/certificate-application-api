// Import the AcademicLevel data model
import { AcademicLevel } from '../db/models/academicLevel.js';
// Import the User model to enforce the delete-guard business rule
import { User } from '../db/models/user.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the AcademicLevel (nivel_academico) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * Both 'name' and 'abbreviation' are backed by fixed MySQL ENUM columns
 * (see migrations/20260707173556-academicLevel.cjs), so this service
 * validates incoming values against the same closed set before hitting
 * the database, giving a clearer Boom error than the raw ENUM rejection
 * MySQL would otherwise throw.
 */
export class AcademicLevelServices {

  // ==========================================================
  // PUBLIC METHODS (instance)
  // ==========================================================

  /**
   * Creates a new academic level record in the database.
   *
   * @param {Object} newAcademicLevel
   * @param {string} newAcademicLevel.name
   * @param {string} newAcademicLevel.abbreviation
   * @returns {Promise<{status: string}>}
   */
  async createOne(newAcademicLevel) {

    try {

      // Validate both fields against the closed ENUM set before querying
      AcademicLevelServices._assertValidName(newAcademicLevel.name);
      AcademicLevelServices._assertValidAbbreviation(newAcademicLevel.abbreviation);

      // Verify an academic level with the same name does not already exist
      const existingLevelByName = await this._findByName(newAcademicLevel.name);

      if (existingLevelByName) {
        throw Boom.conflict('An academic level already exists with the provided name');
      }

      // Verify the abbreviation is not already used by another academic level
      const existingLevelByAbbreviation = await this._findByAbbreviation(newAcademicLevel.abbreviation);

      if (existingLevelByAbbreviation) {
        throw Boom.conflict('An academic level already exists with the provided abbreviation');
      }

      // Create the record (id is generated automatically)
      await AcademicLevel.create({
        name: newAcademicLevel.name,
        abbreviation: newAcademicLevel.abbreviation,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the academic level in the database'
      });
    }
  }

  /**
   * Updates an existing academic level record.
   *
   * @param {number} academicLevelId - The id of the academic level to update.
   * @param {Object} newAcademicLevelData - The new data to persist.
   * @param {string} [newAcademicLevelData.name] - The new academic level name.
   * @param {string} [newAcademicLevelData.abbreviation] - The new academic level abbreviation.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async updateOne(academicLevelId, newAcademicLevelData) {

    if (!newAcademicLevelData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the academic level exists before attempting the update
      const existingAcademicLevel = await this._findById(academicLevelId);

      if (!existingAcademicLevel) {
        throw Boom.notFound('Academic level not found');
      }

      // If a new name is provided, validate it and verify it is not
      // already used by another academic level
      if (newAcademicLevelData.name) {
        AcademicLevelServices._assertValidName(newAcademicLevelData.name);

        const levelWithSameName = await this._findByName(newAcademicLevelData.name);

        if (levelWithSameName && levelWithSameName.id !== academicLevelId) {
          throw Boom.conflict('Another academic level is already registered with that name');
        }
      }

      // If a new abbreviation is provided, validate it and verify it is
      // not already used by another academic level
      if (newAcademicLevelData.abbreviation) {
        AcademicLevelServices._assertValidAbbreviation(newAcademicLevelData.abbreviation);

        const levelWithSameAbbreviation = await this._findByAbbreviation(newAcademicLevelData.abbreviation);

        if (levelWithSameAbbreviation && levelWithSameAbbreviation.id !== academicLevelId) {
          throw Boom.conflict('Another academic level is already registered with that abbreviation');
        }
      }

      // Update the record in the database
      const [updatedRows] = await AcademicLevel.update(
        {
          name: newAcademicLevelData.name,
          abbreviation: newAcademicLevelData.abbreviation,
        },
        {
          where: { id: academicLevelId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Academic level not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the academic level in the database' });
    }
  }

  /**
   * Deletes an academic level record, provided it has no associated users.
   *
   * @param {number} academicLevelId - The id of the academic level to delete.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async deleteOne(academicLevelId) {

    if (!academicLevelId) {
      throw Boom.badRequest('No academic level identifier was provided');
    }

    try {
      // Verify the academic level exists before attempting the deletion
      const existingAcademicLevel = await this._findById(academicLevelId);

      if (!existingAcademicLevel) {
        throw Boom.notFound('Academic level not found');
      }

      // Prevent deletion if the academic level still has associated users,
      // giving a clearer error than the raw RESTRICT constraint from MySQL
      await this._assertNoAssociatedUsers(academicLevelId);

      // Destroy the record in the database
      const deletedRows = await AcademicLevel.destroy({
        where: { id: academicLevelId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Academic level not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the academic level from the database' });
    }
  }

  /**
   * Retrieves a single academic level by its id.
   *
   * @param {number} academicLevelId - The id of the academic level to retrieve.
   * @returns {Promise<AcademicLevel>} - The academic level record.
   */
  async listOne(academicLevelId) {

    if (!academicLevelId) {
      throw Boom.badRequest('No academic level identifier was provided');
    }

    try {
      const theAcademicLevel = await this._findById(academicLevelId);

      if (!theAcademicLevel) {
        throw Boom.notFound('Academic level not found');
      }

      return theAcademicLevel;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the academic level' });
    }
  }

  /**
   * Retrieves all academic level records, ordered alphabetically by name.
   *
   * @returns {Promise<{total: number, records: AcademicLevel[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allAcademicLevels = await AcademicLevel.findAll({
        order: [['name', 'ASC']]
      });

      return {
        total: allAcademicLevels.length,
        records: allAcademicLevels,
      };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the academic levels' });
    }
  }

  /**
   * Retrieves a single academic level by its exact name. Since 'name' is
   * backed by a fixed ENUM (a closed, small set of values), an exact
   * lookup is more meaningful here than a partial-text search.
   *
   * @param {string} name - The academic level name to search for.
   * @returns {Promise<AcademicLevel>} - The matching academic level record.
   */
  async listByName(name) {

    if (!name) {
      throw Boom.badRequest('No academic level name was provided');
    }

    try {
      const theAcademicLevel = await this._findByName(name);

      if (!theAcademicLevel) {
        throw Boom.notFound('Academic level not found with the provided name');
      }

      return theAcademicLevel;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the academic level by its name' });
    }
  }

  /**
   * Retrieves a single academic level by its exact abbreviation. Since
   * 'abbreviation' is backed by a fixed ENUM, an exact lookup is more
   * meaningful here than a partial-text search.
   *
   * @param {string} abbreviation - The academic level abbreviation to search for.
   * @returns {Promise<AcademicLevel>} - The matching academic level record.
   */
  async listByAbbreviation(abbreviation) {

    if (!abbreviation) {
      throw Boom.badRequest('No academic level abbreviation was provided');
    }

    try {
      const theAcademicLevel = await this._findByAbbreviation(abbreviation);

      if (!theAcademicLevel) {
        throw Boom.notFound('Academic level not found with the provided abbreviation');
      }

      return theAcademicLevel;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the academic level by its abbreviation' });
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
   * Finds an academic level by its primary key.
   *
   * @private
   * @param {number} academicLevelId - The id of the academic level to find.
   * @returns {Promise<AcademicLevel|null>} - The academic level record, or null if not found.
   */
  async _findById(academicLevelId) {
    return AcademicLevel.findOne({ where: { id: academicLevelId } });
  }

  /**
   * Finds an academic level by its exact name.
   *
   * @private
   * @param {string} name - The academic level name to find.
   * @returns {Promise<AcademicLevel|null>} - The academic level record, or null if not found.
   */
  async _findByName(name) {
    return AcademicLevel.findOne({ where: { name } });
  }

  /**
   * Finds an academic level by its exact abbreviation.
   *
   * @private
   * @param {string} abbreviation - The academic level abbreviation to find.
   * @returns {Promise<AcademicLevel|null>} - The academic level record, or null if not found.
   */
  async _findByAbbreviation(abbreviation) {
    return AcademicLevel.findOne({ where: { abbreviation } });
  }

  /**
   * Ensures an academic level has no associated users before allowing
   * its deletion, since 'usuario' references 'nivel_academico' with
   * onDelete: 'RESTRICT' at the database level.
   *
   * @private
   * @param {number} academicLevelId - The id of the academic level to check.
   * @throws {Boom} - A conflict error when dependent users exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedUsers(academicLevelId) {
    const associatedUser = await User.findOne({
      where: { academicLevelId }
    });

    if (associatedUser) {
      throw Boom.conflict('The academic level cannot be deleted because it has associated users');
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
   * The closed set of academic level names allowed by the
   * 'nombre_nivel_academico' ENUM column.
   *
   * @static
   * @type {string[]}
   */
  static VALID_NAMES = ['Técnico', 'tecnólogo', 'Licenciado', 'Especialista', 'Maestría', 'Doctorado', 'Post-Doctorado'];

  /**
   * The closed set of academic level abbreviations allowed by the
   * 'abreviatura_nivel_academico' ENUM column.
   *
   * @static
   * @type {string[]}
   */
  static VALID_ABBREVIATIONS = ['Téc', 'Tgo', 'Lic', 'Esp', 'Mgs', 'Ph.D'];

  /**
   * Validates that a name belongs to the closed set of academic level
   * names, throwing a clear Boom error before the query ever reaches
   * the database.
   *
   * @private
   * @static
   * @param {string} name - The academic level name to validate.
   * @throws {Boom} - A bad request error when the name is not allowed.
   * @returns {void}
   */
  static _assertValidName(name) {
    if (!AcademicLevelServices.VALID_NAMES.includes(name)) {
      throw Boom.badRequest(`The academic level name must be one of: ${AcademicLevelServices.VALID_NAMES.join(', ')}`);
    }
  }

  /**
   * Validates that an abbreviation belongs to the closed set of academic
   * level abbreviations, throwing a clear Boom error before the query
   * ever reaches the database.
   *
   * @private
   * @static
   * @param {string} abbreviation - The academic level abbreviation to validate.
   * @throws {Boom} - A bad request error when the abbreviation is not allowed.
   * @returns {void}
   */
  static _assertValidAbbreviation(abbreviation) {
    if (!AcademicLevelServices.VALID_ABBREVIATIONS.includes(abbreviation)) {
      throw Boom.badRequest(`The academic level abbreviation must be one of: ${AcademicLevelServices.VALID_ABBREVIATIONS.join(', ')}`);
    }
  }
}
