// Import the Role data model
import { Role } from '../db/models/role.js';
// Import the User model to enforce the delete-guard business rule
import { User } from '../db/models/user.js';
// Import the Sequelize operators to build advanced query conditions
import { Op } from 'sequelize';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Role (rol) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * 'name' is backed by a fixed MySQL ENUM column (see
 * migrations/20260707175038-role.cjs), so this service validates
 * incoming values against the same closed set before hitting the
 * database, giving a clearer Boom error than the raw ENUM rejection
 * MySQL would otherwise throw.
 *
 * This entity drives role-based access control across the application
 * (see AGENTS.md section 7, checkRole middleware). 'usuario' points to
 * it with onDelete: 'RESTRICT', so a role can never be removed while
 * it is still assigned to at least one account.
 */
export class RoleServices {

  // ==========================================================
  // PUBLIC METHODS (instance)
  // ==========================================================

  /**
   * Creates a new role record in the database.
   *
   * @param {Object} newRole
   * @param {string} newRole.name
   * @param {string} newRole.description
   * @returns {Promise<{status: string}>}
   */
  async createOne(newRole) {

    try {

      // Validate the name against the closed ENUM set before querying
      RoleServices._assertValidName(newRole.name);

      // Verify a role with the same name does not already exist
      const existingRole = await this._findByName(newRole.name);

      if (existingRole) {
        throw Boom.conflict('A role already exists with the provided name');
      }

      // Create the record (id is generated automatically)
      await Role.create({
        name: newRole.name,
        description: newRole.description,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the role in the database'
      });
    }
  }

  /**
   * Updates an existing role record.
   *
   * @param {number} roleId - The id of the role to update.
   * @param {Object} newRoleData - The new data to persist.
   * @param {string} [newRoleData.name] - The new role name.
   * @param {string} [newRoleData.description] - The new role description.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async updateOne(roleId, newRoleData) {

    if (!newRoleData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the role exists before attempting the update
      const existingRole = await this._findById(roleId);

      if (!existingRole) {
        throw Boom.notFound('Role not found');
      }

      // If a new name is provided, validate it and verify it is not
      // already used by another role
      if (newRoleData.name) {
        RoleServices._assertValidName(newRoleData.name);

        const roleWithSameName = await this._findByName(newRoleData.name);

        if (roleWithSameName && roleWithSameName.id !== roleId) {
          throw Boom.conflict('Another role is already registered with that name');
        }
      }

      // Update the record in the database
      const [updatedRows] = await Role.update(
        {
          name: newRoleData.name,
          description: newRoleData.description,
        },
        {
          where: { id: roleId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Role not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the role in the database' });
    }
  }

  /**
   * Deletes a role record, provided it has no associated users.
   *
   * @param {number} roleId - The id of the role to delete.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async deleteOne(roleId) {

    if (!roleId) {
      throw Boom.badRequest('No role identifier was provided');
    }

    try {
      // Verify the role exists before attempting the deletion
      const existingRole = await this._findById(roleId);

      if (!existingRole) {
        throw Boom.notFound('Role not found');
      }

      // Prevent deletion if the role still has associated users, giving
      // a clearer error than the raw RESTRICT constraint from MySQL
      await this._assertNoAssociatedUsers(roleId);

      // Destroy the record in the database
      const deletedRows = await Role.destroy({
        where: { id: roleId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Role not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the role from the database' });
    }
  }

  /**
   * Retrieves a single role by its id.
   *
   * @param {number} roleId - The id of the role to retrieve.
   * @returns {Promise<Role>} - The role record.
   */
  async listOne(roleId) {

    if (!roleId) {
      throw Boom.badRequest('No role identifier was provided');
    }

    try {
      const theRole = await this._findById(roleId);

      if (!theRole) {
        throw Boom.notFound('Role not found');
      }

      return theRole;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the role' });
    }
  }

  /**
   * Retrieves all role records, ordered alphabetically by name.
   *
   * @returns {Promise<{total: number, records: Role[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allRoles = await Role.findAll({
        order: [['name', 'ASC']]
      });

      return { total: allRoles.length, records: allRoles };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the roles' });
    }
  }

  /**
   * Retrieves a single role by its exact name. Since 'name' is backed
   * by a fixed ENUM (a closed, small set of values), an exact lookup is
   * more meaningful here than a partial-text search.
   *
   * @param {string} name - The role name to search for.
   * @returns {Promise<Role>} - The matching role record.
   */
  async listByName(name) {

    if (!name) {
      throw Boom.badRequest('No role name was provided');
    }

    try {
      const theRole = await this._findByName(name);

      if (!theRole) {
        throw Boom.notFound('Role not found with the provided name');
      }

      return theRole;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the role by its name' });
    }
  }

  /**
   * Searches roles whose description partially matches the given text.
   * Unlike 'name', 'description' is free text (STRING(50)), so a
   * partial-text search is meaningful here.
   *
   * @param {string} partialDescription - The partial description to search for.
   * @returns {Promise<{total: number, records: Role[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByPartialDescription(partialDescription) {

    if (!partialDescription) {
      throw Boom.badRequest('No search text was provided');
    }

    try {
      const matchingRoles = await Role.findAll({
        where: {
          description: { [Op.like]: `%${partialDescription}%` }
        },
        order: [['name', 'ASC']]
      });

      return { total: matchingRoles.length, records: matchingRoles };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to search the roles' });
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
   * Finds a role by its primary key.
   *
   * @private
   * @param {number} roleId - The id of the role to find.
   * @returns {Promise<Role|null>} - The role record, or null if not found.
   */
  async _findById(roleId) {
    return Role.findOne({ where: { id: roleId } });
  }

  /**
   * Finds a role by its exact name.
   *
   * @private
   * @param {string} name - The role name to find.
   * @returns {Promise<Role|null>} - The role record, or null if not found.
   */
  async _findByName(name) {
    return Role.findOne({ where: { name } });
  }

  /**
   * Ensures a role has no associated users before allowing its
   * deletion, since 'usuario' references 'rol' with
   * onDelete: 'RESTRICT' at the database level.
   *
   * @private
   * @param {number} roleId - The id of the role to check.
   * @throws {Boom} - A conflict error when dependent users exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedUsers(roleId) {
    const associatedUser = await User.findOne({
      where: { roleId }
    });

    if (associatedUser) {
      throw Boom.conflict('The role cannot be deleted because it has associated users');
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
   * The closed set of role names allowed by the 'nombre_rol' ENUM
   * column.
   *
   * @static
   * @type {string[]}
   */
  static VALID_NAMES = ['Máster', 'Auxiliar', 'Administrador', 'Funcionario', 'Rector'];

  /**
   * Validates that a name belongs to the closed set of role names,
   * throwing a clear Boom error before the query ever reaches the
   * database.
   *
   * @private
   * @static
   * @param {string} name - The role name to validate.
   * @throws {Boom} - A bad request error when the name is not allowed.
   * @returns {void}
   */
  static _assertValidName(name) {
    if (!RoleServices.VALID_NAMES.includes(name)) {
      throw Boom.badRequest(`The role name must be one of: ${RoleServices.VALID_NAMES.join(', ')}`);
    }
  }
}
