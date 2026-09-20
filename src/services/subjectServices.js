// Import the Subject data model
import { Subject } from '../db/models/subject.js';
// Import the Score model to enforce the delete-guard business rule
import { Score } from '../db/models/score.js';
// Import the Sequelize operators to build advanced query conditions
import { Op } from 'sequelize';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Subject (asignatura) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 */
export class SubjectServices {

  // ==========================================================
  // PUBLIC METHODS (instance)
  // ==========================================================

  /**
   * Creates a new subject record in the database.
   *
   * @param {Object} newSubject
   * @param {string} newSubject.name
   * @param {string} newSubject.description
   * @param {number} newSubject.hourlyIntensity
   * @returns {Promise<{status: string}>}
   */
  async createOne(newSubject) {

    try {

      // Verify a subject with the same name does not already exist
      const existingSubjectByName = await this._findByName(newSubject.name);

      if (existingSubjectByName) {
        throw Boom.conflict('A subject with the provided name already exists');
      }

      // Normalize the name before persisting it (trim surrounding whitespace)
      const normalizedName = SubjectServices.formatName(newSubject.name);

      // Create the record (id is generated automatically)
      await Subject.create({
        name: normalizedName,
        description: newSubject.description,
        hourlyIntensity: newSubject.hourlyIntensity,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the subject in the database'
      });
    }
  }

  /**
   * Updates an existing subject record.
   *
   * @param {number} subjectId - The id of the subject to update.
   * @param {Object} newSubjectData - The new data to persist.
   * @param {string} [newSubjectData.name] - The new subject name.
   * @param {string} [newSubjectData.description] - The new subject description.
   * @param {number} [newSubjectData.hourlyIntensity] - The new weekly hourly intensity.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async updateOne(subjectId, newSubjectData) {

    if (!newSubjectData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the subject exists before attempting the update
      const existingSubject = await this._findById(subjectId);

      if (!existingSubject) {
        throw Boom.notFound('Subject not found');
      }

      // If a new name is provided, verify it is not already used by another subject
      if (newSubjectData.name) {
        const subjectWithSameName = await this._findByName(newSubjectData.name);

        if (subjectWithSameName && subjectWithSameName.id !== subjectId) {
          throw Boom.conflict('Another subject is already registered with that name');
        }
      }

      // Normalize the name before persisting it, when provided
      const normalizedName = newSubjectData.name
        ? SubjectServices.formatName(newSubjectData.name)
        : newSubjectData.name;

      // Update the record in the database
      const [updatedRows] = await Subject.update(
        {
          name: normalizedName,
          description: newSubjectData.description,
          hourlyIntensity: newSubjectData.hourlyIntensity,
        },
        {
          where: { id: subjectId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Subject not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the subject in the database' });
    }
  }

  /**
   * Deletes a subject record, provided it has no associated scores.
   *
   * @param {number} subjectId - The id of the subject to delete.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async deleteOne(subjectId) {

    if (!subjectId) {
      throw Boom.badRequest('No subject identifier was provided');
    }

    try {
      // Verify the subject exists before attempting the deletion
      const existingSubject = await this._findById(subjectId);

      if (!existingSubject) {
        throw Boom.notFound('Subject not found');
      }

      // Prevent deletion if the subject still has associated scores,
      // giving a clearer error than the raw RESTRICT constraint from MySQL
      await this._assertNoAssociatedScores(subjectId);

      // Destroy the record in the database
      const deletedRows = await Subject.destroy({
        where: { id: subjectId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Subject not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the subject from the database' });
    }
  }

  /**
   * Retrieves a single subject by its id.
   *
   * @param {number} subjectId - The id of the subject to retrieve.
   * @returns {Promise<Subject>} - The subject record.
   */
  async listOne(subjectId) {

    if (!subjectId) {
      throw Boom.badRequest('No subject identifier was provided');
    }

    try {
      const theSubject = await this._findById(subjectId);

      if (!theSubject) {
        throw Boom.notFound('Subject not found');
      }

      return theSubject;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the subject' });
    }
  }

  /**
   * Retrieves all subject records, ordered alphabetically by name.
   *
   * @returns {Promise<{total: number, records: Subject[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allSubjects = await Subject.findAll({
        order: [['name', 'ASC']]
      });

      return { total: allSubjects.length, records: allSubjects };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the subjects' });
    }
  }

  /**
   * Searches subjects whose name partially matches the given text.
   * Supports the multi-criteria search requirement described in
   * context.md (e.g. 'Nombre parcial').
   *
   * @param {string} partialName - The partial name to search for.
   * @returns {Promise<{total: number, records: Subject[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByPartialName(partialName) {

    if (!partialName) {
      throw Boom.badRequest('No search text was provided');
    }

    try {
      const matchingSubjects = await Subject.findAll({
        where: {
          name: { [Op.like]: `%${partialName}%` }
        },
        order: [['name', 'ASC']]
      });

      return { total: matchingSubjects.length, records: matchingSubjects };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to search the subjects' });
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
   * Finds a subject by its primary key.
   *
   * @private
   * @param {number} subjectId - The id of the subject to find.
   * @returns {Promise<Subject|null>} - The subject record, or null if not found.
   */
  async _findById(subjectId) {
    return Subject.findOne({ where: { id: subjectId } });
  }

  /**
   * Finds a subject by its exact name.
   *
   * @private
   * @param {string} name - The subject name to find.
   * @returns {Promise<Subject|null>} - The subject record, or null if not found.
   */
  async _findByName(name) {
    return Subject.findOne({ where: { name } });
  }

  /**
   * Ensures a subject has no associated scores before allowing its
   * deletion, since 'calificacion' references 'asignatura' with
   * onDelete: 'RESTRICT' at the database level.
   *
   * @private
   * @param {number} subjectId - The id of the subject to check.
   * @throws {Boom} - A conflict error when dependent scores exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedScores(subjectId) {
    const associatedScore = await Score.findOne({
      where: { subjectId }
    });

    if (associatedScore) {
      throw Boom.conflict('The subject cannot be deleted because it has associated scores');
    }
  }

  // ==========================================================
  // STATIC UTILITIES
  // Stateless helpers that do not depend on instance data, and are
  // therefore exposed as static methods (callable as
  // SubjectServices.formatName(...) without instantiating the class).
  // ==========================================================

  /**
   * Normalizes a subject name to the format expected by the
   * subjectName RegEx and stored in the database (trimmed, so
   * accidental leading/trailing whitespace never creates a
   * near-duplicate entry).
   *
   * @static
   * @param {string} name - The raw subject name to normalize.
   * @returns {string} - The normalized subject name.
   */
  static formatName(name) {
    return name.trim();
  }
}
