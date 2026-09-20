/**
 * Service layer for the Group (grupo) entity.
 * Handles all business logic, database operations, and data formatting
 * before returning results to the controllers.
 *
 * @module services/groupServices
 */

// ── Models ──────────────────────────────────────────────────────────────────
import { Group } from '../db/models/group.js';
import { Enrollment } from '../db/models/enrollment.js';
import { Institution } from '../db/models/institution.js';
import { Grade } from '../db/models/grade.js';

// ── Sequelize operators ─────────────────────────────────────────────────────
import { Op } from 'sequelize';

// ── Error handling ──────────────────────────────────────────────────────────
import Boom from '@hapi/boom';

/**
 * @class GroupServices
 * @description Provides all CRUD and business operations for Group records.
 * Every public method returns either a status object or a formatted record
 * (with related Institution and Grade nested as `{ id, name }`).
 * Controllers never interact with Sequelize directly; they go through this class.
 */
export class GroupServices {

  // ==========================================================
  // PUBLIC METHODS
  // ==========================================================

  /**
   * Creates a new group record.
   * Validates the academic year, shift, status, and the existence of
   * the referenced Institution and Grade (if provided). Enforces the
   * unique composite key (name + year + grade + institution).
   *
   * @param {Object} newGroup - The new group data.
   * @param {string} newGroup.name - Group name (e.g., "11-A").
   * @param {number} newGroup.year - Academic year (1901–2155).
   * @param {number} [newGroup.gradeId] - FK to the Grade.
   * @param {string} newGroup.shift - 'DIURNA' or 'NOCTURNA'.
   * @param {number} [newGroup.institutionId] - FK to the Institution.
   * @param {string} newGroup.status - 'ACTIVO' or 'INACTIVO'.
   * @returns {Promise<{status: string}>} - Success status object.
   * @throws {Boom} - On validation errors, conflicts, or DB failures.
   */
  async createOne(newGroup) {
    try {
      GroupServices._assertValidYear(newGroup.year);

      // Validate enum‑like fields
      GroupServices._assertValidShift(newGroup.shift);
      GroupServices._assertValidStatus(newGroup.status);

      // Ensure the referenced institution and grade exist
      if (newGroup.institutionId) {
        await this._assertExists(Institution, newGroup.institutionId, 'Institution');
      }
      if (newGroup.gradeId) {
        await this._assertExists(Grade, newGroup.gradeId, 'Grade');
      }

      // Composite unique constraint
      const existing = await this._findByCompositeKey(
        newGroup.name, newGroup.year, newGroup.gradeId, newGroup.institutionId
      );
      if (existing) {
        throw Boom.conflict('A group with the same name, year, grade and institution already exists');
      }

      await Group.create({
        name: newGroup.name,
        year: newGroup.year,
        gradeId: newGroup.gradeId,
        shift: newGroup.shift,
        institutionId: newGroup.institutionId,
        status: newGroup.status,
      });

      return { status: 'CREATED SUCCESSFULLY' };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to create the group in the database' });
    }
  }

  /**
   * Updates an existing group record.
   * Validates any updated fields (year, shift, status, institution, grade)
   * and checks the composite key uniqueness if any part of it changes.
   *
   * @param {number} groupId - The ID of the group to update.
   * @param {Object} newGroupData - The fields to update.
   * @param {string} [newGroupData.name] - New group name.
   * @param {number} [newGroupData.year] - New academic year.
   * @param {number} [newGroupData.gradeId] - New grade ID.
   * @param {string} [newGroupData.shift] - New shift ('DIURNA'/'NOCTURNA').
   * @param {number} [newGroupData.institutionId] - New institution ID.
   * @param {string} [newGroupData.status] - New status ('ACTIVO'/'INACTIVO').
   * @returns {Promise<{status: string}>} - Success status object.
   * @throws {Boom} - If the group doesn't exist, data is invalid, or a conflict occurs.
   */
  async updateOne(groupId, newGroupData) {
    if (!newGroupData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      const existingGroup = await this._findById(groupId);
      if (!existingGroup) {
        throw Boom.notFound('Group not found');
      }

      // Validate fields when present
      if (newGroupData.year) GroupServices._assertValidYear(newGroupData.year);
      if (newGroupData.shift) GroupServices._assertValidShift(newGroupData.shift);
      if (newGroupData.status) GroupServices._assertValidStatus(newGroupData.status);

      // Existence checks for foreign keys
      if (newGroupData.institutionId) {
        await this._assertExists(Institution, newGroupData.institutionId, 'Institution');
      }
      if (newGroupData.gradeId) {
        await this._assertExists(Grade, newGroupData.gradeId, 'Grade');
      }

      // Composite key uniqueness (if any part changes)
      const keyFieldsChanged = ['name','year','gradeId','institutionId']
        .some(f => Object.prototype.hasOwnProperty.call(newGroupData, f));

      if (keyFieldsChanged) {
        const duplicate = await this._findByCompositeKey(
          newGroupData.name ?? existingGroup.name,
          newGroupData.year ?? existingGroup.year,
          newGroupData.gradeId ?? existingGroup.gradeId,
          newGroupData.institutionId ?? existingGroup.institutionId
        );
        if (duplicate && duplicate.id !== groupId) {
          throw Boom.conflict('Another group already exists with the same name, year, grade and institution');
        }
      }

      const [updatedRows] = await Group.update(
        {
          name: newGroupData.name,
          year: newGroupData.year,
          gradeId: newGroupData.gradeId,
          shift: newGroupData.shift,
          institutionId: newGroupData.institutionId,
          status: newGroupData.status,
        },
        { where: { id: groupId } }
      );

      if (!updatedRows) throw Boom.notFound('Group not found');

      return { status: 'UPDATED SUCCESSFULLY' };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the group in the database' });
    }
  }

  /**
   * Deletes a group after verifying it has no associated enrollments.
   * (Even though the DB uses ON DELETE SET NULL, this prevents accidental orphaning.)
   *
   * @param {number} groupId - The ID of the group to delete.
   * @returns {Promise<{status: string}>} - Success status object.
   * @throws {Boom} - If the group doesn't exist, has enrollments, or DB fails.
   */
  async deleteOne(groupId) {
    if (!groupId) throw Boom.badRequest('No group identifier was provided');

    try {
      const existingGroup = await this._findById(groupId);
      if (!existingGroup) throw Boom.notFound('Group not found');

      await this._assertNoAssociatedEnrollments(groupId);

      const deletedRows = await Group.destroy({ where: { id: groupId } });
      if (!deletedRows) throw Boom.notFound('Group not found');

      return { status: 'DELETED SUCCESSFULLY' };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the group from the database' });
    }
  }

  /**
   * Retrieves a single group by its ID, with its Institution and Grade
   * embedded as nested `{ id, name }` objects.
   *
   * @param {number} groupId - The group ID.
   * @returns {Promise<Object>} - Formatted group object.
   * @throws {Boom} - If not found or DB error.
   */
  async listOne(groupId) {
    if (!groupId) throw Boom.badRequest('No group identifier was provided');

    try {
      const group = await Group.findOne({
        where: { id: groupId },
        include: GroupServices.CATALOG_INCLUDES,
      });
      if (!group) throw Boom.notFound('Group not found');

      return GroupServices._formatGroup(group);
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the group' });
    }
  }

  /**
   * Retrieves all groups, ordered by year DESC and name ASC, with
   * Institution and Grade nested as `{ id, name }`.
   *
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   * @throws {Boom} - On DB failure.
   */
  async listAll() {
    try {
      const allGroups = await Group.findAll({
        order: [['year', 'DESC'], ['name', 'ASC']],
        include: GroupServices.CATALOG_INCLUDES,
      });

      const records = allGroups.map(GroupServices._formatGroup);

      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the groups' });
    }
  }

  /**
   * Searches groups whose name partially matches the given text (LIKE %...%).
   * Results include nested Institution and Grade.
   *
   * @param {string} partialName - Partial name to search for.
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   * @throws {Boom} - If no search text provided or DB error.
   */
  async listByPartialName(partialName) {
    if (!partialName) throw Boom.badRequest('No search text was provided');

    try {
      const groups = await Group.findAll({
        where: { name: { [Op.like]: `%${partialName}%` } },
        order: [['year', 'DESC'], ['name', 'ASC']],
        include: GroupServices.CATALOG_INCLUDES,
      });

      const records = groups.map(GroupServices._formatGroup);

      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to search the groups' });
    }
  }

  /**
   * Retrieves all groups that belong to a specific institution.
   * Results include nested Institution and Grade.
   *
   * @param {number} institutionId - The institution ID to filter by.
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   * @throws {Boom} - If missing ID or DB error.
   */
  async listByInstitution(institutionId) {
    if (!institutionId) throw Boom.badRequest('No institution identifier was provided');

    try {
      const groups = await Group.findAll({
        where: { institutionId },
        order: [['year', 'DESC'], ['name', 'ASC']],
        include: GroupServices.CATALOG_INCLUDES,
      });

      const records = groups.map(GroupServices._formatGroup);

      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find groups for the given institution' });
    }
  }

  /**
   * Retrieves groups for a specific grade and academic year combination.
   * Results include nested Institution and Grade.
   *
   * @param {number} gradeId - The grade ID.
   * @param {number} year - The academic year.
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   * @throws {Boom} - If missing parameters or DB error.
   */
  async listByGradeAndYear(gradeId, year) {
    if (!gradeId || !year) throw Boom.badRequest('Both grade and year must be provided');

    try {
      const groups = await Group.findAll({
        where: { gradeId, year },
        order: [['name', 'ASC']],
        include: GroupServices.CATALOG_INCLUDES,
      });

      const records = groups.map(GroupServices._formatGroup);

      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find groups for the given grade and year' });
    }
  }

  /**
   * Changes the status of a group (ACTIVO / INACTIVO) without altering
   * other fields. The new status must be one of the allowed values.
   *
   * @param {number} groupId - The group ID.
   * @param {string} newStatus - The new status ('ACTIVO' or 'INACTIVO').
   * @returns {Promise<{status: string}>} - Success status object.
   * @throws {Boom} - If group not found, invalid status, or DB error.
   */
  async changeStatus(groupId, newStatus) {
    if (!groupId) throw Boom.badRequest('No group identifier was provided');

    GroupServices._assertValidStatus(newStatus);

    try {
      const existingGroup = await this._findById(groupId);
      if (!existingGroup) throw Boom.notFound('Group not found');

      await Group.update(
        { status: newStatus },
        { where: { id: groupId } }
      );
      return { status: 'STATUS UPDATED SUCCESSFULLY' };
    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the group status' });
    }
  }

  // ==========================================================
  // PRIVATE HELPERS (instance)
  // ==========================================================

  /**
   * Finds a group by its primary key.
   * @private
   * @param {number} groupId
   * @returns {Promise<Group|null>}
   */
  async _findById(groupId) {
    return Group.findOne({ where: { id: groupId } });
  }

  /**
   * Finds a group by its composite unique key.
   * @private
   * @param {string} name - Group name.
   * @param {number} year - Academic year.
   * @param {number} gradeId - Grade ID.
   * @param {number} institutionId - Institution ID.
   * @returns {Promise<Group|null>}
   */
  async _findByCompositeKey(name, year, gradeId, institutionId) {
    return Group.findOne({ where: { name, year, gradeId, institutionId } });
  }

  /**
   * Throws a conflict error if any enrollment still references this group.
   * @private
   * @param {number} groupId
   * @throws {Boom.conflict}
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedEnrollments(groupId) {
    const enrollment = await Enrollment.findOne({ where: { groupId } });
    if (enrollment) {
      throw Boom.conflict('The group cannot be deleted because it has associated enrollments');
    }
  }

  /**
   * Verifies that a referenced entity (e.g., Institution or Grade) exists.
   * @private
   * @param {Model} model - Sequelize model to query.
   * @param {number} id - Primary key to look up.
   * @param {string} name - Human‑readable name for the error message.
   * @throws {Boom.notFound} if the record doesn't exist.
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
  // ==========================================================

  /**
   * Sequelize include configurations for eager‑loading Institution and Grade
   * as `{ id, name }` objects.
   * @static
   * @type {Array<Object>}
   */
  static CATALOG_INCLUDES = [
    { model: Institution, as: 'institution', attributes: ['id', 'name'] },
    { model: Grade, as: 'grade', attributes: ['id', 'name'] },
  ];

  /**
   * Reshapes a Sequelize Group instance into a plain object,
   * replacing `institutionId` and `gradeId` with nested `institution` and `grade`
   * objects (or `null` if not present).
   *
   * @private
   * @static
   * @param {Group} group - Sequelize instance with eager‑loaded associations.
   * @returns {Object} Formatted group object.
   */
  static _formatGroup(group) {
    const {
      institutionId,
      gradeId,
      institution,
      grade,
      ...rest
    } = group.toJSON();

    return {
      ...rest,
      institution: institution ?? null,
      grade: grade ?? null,
    };
  }

  // ── Validations (static) ─────────────────────────────────────────────────

  /**
   * Allowed values for the `shift` field.
   * @static
   * @type {string[]}
   */
  static VALID_SHIFTS = ['DIURNA', 'NOCTURNA'];

  /**
   * Allowed values for the `status` field.
   * @static
   * @type {string[]}
   */
  static VALID_STATUSES = ['ACTIVO', 'INACTIVO'];

  /**
   * Validates the shift value against the allowed set.
   * @static
   * @param {string} shift
   * @throws {Boom.badRequest} if invalid.
   */
  static _assertValidShift(shift) {
    if (!GroupServices.VALID_SHIFTS.includes(shift)) {
      throw Boom.badRequest(`Shift must be one of: ${GroupServices.VALID_SHIFTS.join(', ')}`);
    }
  }

  /**
   * Validates the status value against the allowed set.
   * @static
   * @param {string} status
   * @throws {Boom.badRequest} if invalid.
   */
  static _assertValidStatus(status) {
    if (!GroupServices.VALID_STATUSES.includes(status)) {
      throw Boom.badRequest(`Status must be one of: ${GroupServices.VALID_STATUSES.join(', ')}`);
    }
  }

  /**
   * Validates that the academic year is within MySQL's supported YEAR range (1901–2155).
   * @static
   * @param {number} year
   * @throws {Boom.badRequest} if out of range.
   */
  static _assertValidYear(year) {
    if (year < 1901 || year > 2155) {
      throw Boom.badRequest('The academic year must be between 1901 and 2155');
    }
  }
}
