// Import the Score data model
import { Score } from '../db/models/score.js';
// Import related catalog/entity models to embed FK data as nested objects
// and to verify referential integrity before writing
import { Subject } from '../db/models/subject.js';
import { Enrollment } from '../db/models/enrollment.js';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Score (calificacion) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * Per context.md, the system supports two scoring formats — numeric
 * (0.0 to 5.0) and alphabetic ('Insuficiente', 'Aceptable',
 * 'Sobresaliente', 'Excelente', plus 'Deficiente' per
 * utils/RegEx/scoreRegEx.js) — and the original value recorded must
 * NEVER be modified in spirit: 'originalScore' always mirrors exactly
 * what was historically recorded, while 'remedialScore' ("nota de
 * habilitación") tracks any make-up grade. Both fields share the same
 * closed set of accepted values, so this service enforces that
 * whichever value is provided for either field actually matches the
 * declared 'scoreType' (NUMERICA vs ALFABETICA) — the regex alone
 * cannot express that cross-field relationship (see the NOTE at the
 * bottom of scoreRegEx.js), so it is validated here as defense in depth
 * ahead of the equivalent Joi.when() rule at the schema layer.
 *
 * The database enforces a composite unique index on
 * (id_asignatura_calificacion, id_matricula_calificacion) — a subject
 * can only have one score per enrollment — but this service still
 * checks that combination explicitly before writing, per AGENTS.md
 * section 6, so a duplicate score surfaces a clear Boom.conflict
 * instead of the raw ORM unique-constraint error.
 *
 * Unlike most other entities in this domain, no table references
 * 'calificacion' as a foreign key, so deleteOne requires no
 * associated-records guard.
 *
 * Every method that returns a Score record (listOne, listAll,
 * listBySubject, listByEnrollment, getBySubjectAndEnrollment) embeds
 * its related subject and enrollment as nested objects, rather than
 * exposing the raw 'subjectId'/'enrollmentId' foreign key integers.
 * The embedded enrollment is kept shallow (id + enrollmentDate only)
 * since a full student/group breakdown belongs to EnrollmentServices,
 * not here.
 */
export class ScoreServices {


  // PUBLIC METHODS


  /**
   * Creates a new score record in the database.
   *
   * @param {Object} newScore
   * @param {string} newScore.originalScore
   * @param {string} newScore.scoreType
   * @param {number} newScore.subjectId
   * @param {string} newScore.remedialScore
   * @param {number} newScore.enrollmentId
   * @returns {Promise<{status: string}>}
   */
  async createOne(newScore) {

    try {

      // Validate the score type against the closed ENUM set before
      // anything else, since the value-format checks below depend on it
      ScoreServices._assertValidScoreType(newScore.scoreType);

      // Verify both values are internally consistent with the declared
      // score type (e.g. a 'NUMERICA' type cannot carry 'Sobresaliente')
      ScoreServices._assertValueMatchesType(newScore.originalScore, newScore.scoreType, 'originalScore');
      ScoreServices._assertValueMatchesType(newScore.remedialScore, newScore.scoreType, 'remedialScore');

      // Verify the referenced subject and enrollment actually exist
      await this._assertExists(Subject, newScore.subjectId, 'Subject');
      await this._assertExists(Enrollment, newScore.enrollmentId, 'Enrollment');

      // Verify the subject does not already have a score registered for
      // that same enrollment, mirroring the composite unique index
      // defined at the database level
      const existingScore = await this._findBySubjectAndEnrollment(
        newScore.subjectId, newScore.enrollmentId
      );

      if (existingScore) {
        throw Boom.conflict('A score for the provided subject already exists for that enrollment');
      }

      // Create the record (id is generated automatically)
      await Score.create({
        originalScore: newScore.originalScore,
        scoreType: newScore.scoreType,
        subjectId: newScore.subjectId,
        remedialScore: newScore.remedialScore,
        enrollmentId: newScore.enrollmentId,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the score in the database'
      });
    }
  }

  /**
   * Updates an existing score record.
   *
   * @param {number} scoreId
   * @param {Object} newScoreData
   * @param {string} [newScoreData.originalScore]
   * @param {string} [newScoreData.scoreType]
   * @param {number} [newScoreData.subjectId]
   * @param {string} [newScoreData.remedialScore]
   * @param {number} [newScoreData.enrollmentId]
   * @returns {Promise<{status: string}>}
   */
  async updateOne(scoreId, newScoreData) {

    if (!newScoreData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the score exists before attempting the update
      const existingScore = await this._findById(scoreId);

      if (!existingScore) {
        throw Boom.notFound('Score not found');
      }

      // If a new score type is provided, validate it against the ENUM
      if (newScoreData.scoreType) {
        ScoreServices._assertValidScoreType(newScoreData.scoreType);
      }

      // The effective score type after this update (either the new one
      // being set, or the one the record already has) is what any
      // updated value must be consistent with
      const effectiveScoreType = newScoreData.scoreType ?? existingScore.scoreType;

      if (newScoreData.originalScore) {
        ScoreServices._assertValueMatchesType(newScoreData.originalScore, effectiveScoreType, 'originalScore');
      }

      if (newScoreData.remedialScore) {
        ScoreServices._assertValueMatchesType(newScoreData.remedialScore, effectiveScoreType, 'remedialScore');
      }

      // If the score type changes without new values being provided,
      // verify the EXISTING values still match the new type
      if (newScoreData.scoreType && !newScoreData.originalScore) {
        ScoreServices._assertValueMatchesType(existingScore.originalScore, effectiveScoreType, 'originalScore');
      }

      if (newScoreData.scoreType && !newScoreData.remedialScore) {
        ScoreServices._assertValueMatchesType(existingScore.remedialScore, effectiveScoreType, 'remedialScore');
      }

      // If a new subject is provided, verify it actually exists
      if (newScoreData.subjectId) {
        await this._assertExists(Subject, newScoreData.subjectId, 'Subject');
      }

      // If a new enrollment is provided, verify it actually exists
      if (newScoreData.enrollmentId) {
        await this._assertExists(Enrollment, newScoreData.enrollmentId, 'Enrollment');
      }

      // If either half of the composite key changes, verify the
      // resulting combination is not already used by another score
      if (newScoreData.subjectId || newScoreData.enrollmentId) {
        const scoreWithSameKey = await this._findBySubjectAndEnrollment(
          newScoreData.subjectId ?? existingScore.subjectId,
          newScoreData.enrollmentId ?? existingScore.enrollmentId
        );

        if (scoreWithSameKey && scoreWithSameKey.id !== scoreId) {
          throw Boom.conflict('Another score already exists for that subject and enrollment');
        }
      }

      // Update the record in the database
      const [updatedRows] = await Score.update(
        {
          originalScore: newScoreData.originalScore,
          scoreType: newScoreData.scoreType,
          subjectId: newScoreData.subjectId,
          remedialScore: newScoreData.remedialScore,
          enrollmentId: newScoreData.enrollmentId,
        },
        {
          where: { id: scoreId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Score not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the score in the database' });
    }
  }

  /**
   * Deletes a score record. No other table references 'calificacion' as
   * a foreign key, so no associated-records guard is required here.
   *
   * @param {number} scoreId
   * @returns {Promise<{status: string}>}
   */
  async deleteOne(scoreId) {

    if (!scoreId) {
      throw Boom.badRequest('No score identifier was provided');
    }

    try {
      // Verify the score exists before attempting the deletion
      const existingScore = await this._findById(scoreId);

      if (!existingScore) {
        throw Boom.notFound('Score not found');
      }

      // Destroy the record in the database
      const deletedRows = await Score.destroy({
        where: { id: scoreId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Score not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the score from the database' });
    }
  }

  /**
   * Retrieves a single score by its id, embedding its related subject
   * and enrollment as nested objects.
   *
   * @param {number} scoreId
   * @returns {Promise<Object>}
   */
  async listOne(scoreId) {

    if (!scoreId) {
      throw Boom.badRequest('No score identifier was provided');
    }

    try {
      const theScore = await Score.findOne({
        where: { id: scoreId },
        include: ScoreServices.CATALOG_INCLUDES,
      });

      if (!theScore) {
        throw Boom.notFound('Score not found');
      }

      return ScoreServices._formatScore(theScore);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the score' });
    }
  }

  /**
   * Retrieves all score records, ordered by id, each with its related
   * subject and enrollment embedded as nested objects.
   *
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allScores = await Score.findAll({
        order: [['id', 'ASC']],
        include: ScoreServices.CATALOG_INCLUDES,
      });

      const records = allScores.map(ScoreServices._formatScore);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the scores' });
    }
  }

  /**
   * Retrieves every score belonging to a given subject. Useful for
   * subject-level reporting (e.g. how a subject performed across
   * different enrollments).
   *
   * @param {number} subjectId
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listBySubject(subjectId) {

    if (!subjectId) {
      throw Boom.badRequest('No subject identifier was provided');
    }

    try {
      const scoresBySubject = await Score.findAll({
        where: { subjectId },
        order: [['id', 'ASC']],
        include: ScoreServices.CATALOG_INCLUDES,
      });

      const records = scoresBySubject.map(ScoreServices._formatScore);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the scores for the given subject' });
    }
  }

  /**
   * Retrieves every score belonging to a given enrollment. This is the
   * primary lookup used to build a student's academic history/report
   * card for a specific enrollment, per context.md ('el sistema obtiene
   * toda la información mediante consultas SQL... sobre las entidades
   * académicas').
   *
   * @param {number} enrollmentId
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByEnrollment(enrollmentId) {

    if (!enrollmentId) {
      throw Boom.badRequest('No enrollment identifier was provided');
    }

    try {
      const scoresByEnrollment = await Score.findAll({
        where: { enrollmentId },
        order: [['id', 'ASC']],
        include: ScoreServices.CATALOG_INCLUDES,
      });

      const records = scoresByEnrollment.map(ScoreServices._formatScore);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the scores for the given enrollment' });
    }
  }

  /**
   * Retrieves the single score (if any) recorded for a specific subject
   * within a specific enrollment. Useful to check whether a subject has
   * already been graded for an enrollment before attempting to create a
   * new score.
   *
   * @param {number} subjectId
   * @param {number} enrollmentId
   * @returns {Promise<Object>}
   */
  async getBySubjectAndEnrollment(subjectId, enrollmentId) {

    if (!subjectId || !enrollmentId) {
      throw Boom.badRequest('Both a subject identifier and an enrollment identifier must be provided');
    }

    try {
      const theScore = await Score.findOne({
        where: { subjectId, enrollmentId },
        include: ScoreServices.CATALOG_INCLUDES,
      });

      if (!theScore) {
        throw Boom.notFound('No score was found for the provided subject and enrollment');
      }

      return ScoreServices._formatScore(theScore);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the score for the given subject and enrollment' });
    }
  }


  // PRIVATE HELPERS
  // Naming convention: a leading underscore marks a method as
  // internal to this class and not meant to be called from
  // controllers. True '#private' class fields are intentionally
  // avoided to stay compatible with the ecmaVersion 12 (ES2021)
  // parser target declared in .eslintrc.json.


  /**
   * Finds a score by its primary key. Used internally by write
   * operations (updateOne/deleteOne) that only need to check existence,
   * so it intentionally does NOT eager-load the subject/enrollment
   * associations — callers that need the formatted, nested shape
   * should go through listOne() instead.
   *
   * @private
   * @param {number} scoreId
   * @returns {Promise<Score|null>}
   */
  async _findById(scoreId) {
    return Score.findOne({ where: { id: scoreId } });
  }

  /**
   * Finds a score by the composite key of subject + enrollment. This
   * mirrors the database-level unique index described in the class
   * JSDoc, letting the service surface a clear Boom.conflict before the
   * query ever reaches the database.
   *
   * @private
   * @param {number} subjectId
   * @param {number} enrollmentId
   * @returns {Promise<Score|null>}
   */
  async _findBySubjectAndEnrollment(subjectId, enrollmentId) {
    return Score.findOne({ where: { subjectId, enrollmentId } });
  }

  /**
   * Verifies that a referenced entity (Subject or Enrollment) exists.
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


  // STATIC UTILITIES
  // Stateless helpers that do not depend on instance data, and are
  // therefore exposed as static methods. The ones prefixed with '_'
  // are intended strictly for internal use within this class (mirroring
  // the instance-method privacy convention), since ecmaVersion 12
  // (ES2021) does not support true private static members without
  // '#' fields.


  /**
   * The closed set of score types allowed by the
   * 'tipo_nota_calificacion' ENUM column.
   *
   * @static
   * @type {string[]}
   */
  static VALID_SCORE_TYPES = ['NUMERICA', 'ALFABETICA'];

  /**
   * The closed set of alphabetic grade labels accepted by
   * 'nota_original_calificacion'/'nota_habilitacion' when
   * 'tipo_nota_calificacion' is 'ALFABETICA', matching
   * scoreOriginalValue/scoreRemedialValue in utils/RegEx/scoreRegEx.js.
   *
   * @static
   * @type {string[]}
   */
  static ALPHABETIC_VALUES = ['Deficiente', 'Insuficiente', 'Aceptable', 'Sobresaliente', 'Excelente'];

  /**
   * The numeric grade pattern accepted by
   * 'nota_original_calificacion'/'nota_habilitacion' when
   * 'tipo_nota_calificacion' is 'NUMERICA': 0.0 to 5.0 with exactly
   * one decimal digit, matching scoreOriginalValue/scoreRemedialValue
   * in utils/RegEx/scoreRegEx.js.
   *
   * @static
   * @type {RegExp}
   */
  static NUMERIC_VALUE_PATTERN = /^[0-5]\.\d$/;

  /**
   * Validates that a score type belongs to the closed ENUM set,
   * throwing a clear Boom error before the query ever reaches the
   * database.
   *
   * @private
   * @static
   * @param {string} scoreType
   * @throws {Boom}
   * @returns {void}
   */
  static _assertValidScoreType(scoreType) {
    if (!ScoreServices.VALID_SCORE_TYPES.includes(scoreType)) {
      throw Boom.badRequest(`The score type must be one of: ${ScoreServices.VALID_SCORE_TYPES.join(', ')}`);
    }
  }

  /**
   * Validates that a score value (originalScore or remedialScore) is
   * internally consistent with the declared score type: a numeric
   * pattern when the type is 'NUMERICA', or one of the closed
   * alphabetic labels when the type is 'ALFABETICA'. The RegEx patterns
   * in scoreRegEx.js accept either shape regardless of type (see the
   * NOTE at the bottom of that file), so this cross-field check is
   * enforced here instead.
   *
   * @private
   * @static
   * @param {string} value
   * @param {string} scoreType
   * @param {string} fieldName
   * @throws {Boom}
   * @returns {void}
   */
  static _assertValueMatchesType(value, scoreType, fieldName) {
    if (scoreType === 'NUMERICA' && !ScoreServices.NUMERIC_VALUE_PATTERN.test(value)) {
      throw Boom.badRequest(`${fieldName} must be a number between 0.0 and 5.0 when the score type is NUMERICA`);
    }

    if (scoreType === 'ALFABETICA' && !ScoreServices.ALPHABETIC_VALUES.includes(value)) {
      throw Boom.badRequest(`${fieldName} must be one of: ${ScoreServices.ALPHABETIC_VALUES.join(', ')} when the score type is ALFABETICA`);
    }
  }

  /**
   * Sequelize include for the related Subject, exposing only the id
   * and name.
   *
   * @static
   */
  static SUBJECT_INCLUDE = {
    model: Subject,
    as: 'subject',
    attributes: ['id', 'name'],
  };

  /**
   * Sequelize include for the related Enrollment, kept shallow (id and
   * enrollment date only) since a full student/group breakdown belongs
   * to EnrollmentServices, not here.
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
   * needs to embed the related subject and enrollment as nested
   * objects rather than raw foreign key integers.
   *
   * @static
   */
  static CATALOG_INCLUDES = [
    ScoreServices.SUBJECT_INCLUDE,
    ScoreServices.ENROLLMENT_INCLUDE,
  ];

  /**
   * Reshapes a Score Sequelize instance (with its 'subject' and
   * 'enrollment' associations eagerly loaded via CATALOG_INCLUDES) into
   * a plain object where the raw 'subjectId'/'enrollmentId' foreign
   * keys are replaced by nested { id, ... } objects.
   *
   * @private
   * @static
   * @param {Score} score
   * @returns {Object}
   */
  static _formatScore(score) {
    const { subjectId, enrollmentId, subject, enrollment, ...rest } = score.toJSON();

    return {
      ...rest,
      subject: subject ?? null,
      enrollment: enrollment ?? null,
    };
  }
}
