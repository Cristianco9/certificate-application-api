/**
 * @module services/userServices
 * @description Service layer for user CRUD operations.
 *
 * Handles user creation, update, deletion, and retrieval. Retrieval methods
 * eagerly load related catalog records (role, document type, municipality,
 * academic level, gender) and format them as nested `{ id, name }` objects
 * instead of raw foreign-key ids. Password hashes are never returned.
 */

// import the user data model
import { User } from '../db/models/user.js';
// import the related catalog models needed to embed FK data as nested objects
import { Role } from '../db/models/role.js';
import { DocumentType } from '../db/models/documentType.js';
import { Municipality } from '../db/models/municipality.js';
import { AcademicLevel } from '../db/models/academicLevel.js';
import { Gender } from '../db/models/gender.js';
// import the promise to encrypt the user's password
import { hashPassword } from '../utils/auth/passwordHash.js';
// boom allows managing possible errors
import Boom from '@hapi/boom';

/**
 * Service class for managing users.
 *
 * Provides methods to create, update, delete, and retrieve users. It also
 * centralizes password hashing, username uniqueness validation, catalog
 * relation embedding, and consistent Boom error handling.
 *
 * @class UserServices
 */
export class UserServices {

  /**
   * Creates a new user after verifying that the username is unique and
   * hashing the supplied password.
   *
   * @async
   * @param {Object} newUser - User creation payload.
   * @param {string} newUser.username - Unique username.
   * @param {string} newUser.password - Plain-text password to be hashed.
   * @param {string} newUser.firstName - User first name.
   * @param {string} newUser.lastName - User last name.
   * @param {number} newUser.documentTypeId - FK to the document type catalog.
   * @param {string} newUser.documentNumber - User document number.
   * @param {number} newUser.municipalityId - FK to the municipality catalog.
   * @param {number} newUser.roleId - FK to the role catalog.
   * @param {number} newUser.academicLevelId - FK to the academic level catalog.
   * @param {string} newUser.email - User email address.
   * @param {string} newUser.status - User status.
   * @param {number} newUser.genderId - FK to the gender catalog.
   * @param {Date} [newUser.lastLogin] - Last login date. Defaults to the current date.
   * @returns {Promise<{ status: string }>} Result object with a success status message.
   * @throws {Boom} Throws `Boom.conflict` if the username already exists, or a
   * wrapped Boom error if user creation fails.
   */
  async createOne(newUser) {

    try {
      const existingUserByUsername = await User.findOne({
        where: { username: newUser.username }
      });

      if (existingUserByUsername) {
        throw Boom.conflict('Username already exists');
      }

      const hash = await hashPassword(newUser.password);

      await User.create({
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        documentTypeId: newUser.documentTypeId,
        documentNumber: newUser.documentNumber,
        municipalityId: newUser.municipalityId,
        roleId: newUser.roleId,
        academicLevelId: newUser.academicLevelId,
        email: newUser.email,
        status: newUser.status,
        password: hash,
        genderId: newUser.genderId,
        lastLogin: newUser.lastLogin ?? new Date(),
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to create new user' });
    }
  }

  /**
   * Updates an existing user by id.
   *
   * Password and last login are intentionally not updated by this method.
   *
   * @async
   * @param {number} userId - Id of the user to update.
   * @param {Object} newUserData - Fields to update.
   * @param {string} newUserData.username - Username.
   * @param {string} newUserData.firstName - User first name.
   * @param {string} newUserData.lastName - User last name.
   * @param {number} newUserData.documentTypeId - FK to the document type catalog.
   * @param {string} newUserData.documentNumber - User document number.
   * @param {number} newUserData.municipalityId - FK to the municipality catalog.
   * @param {number} newUserData.roleId - FK to the role catalog.
   * @param {number} newUserData.academicLevelId - FK to the academic level catalog.
   * @param {string} newUserData.email - User email address.
   * @param {string} newUserData.status - User status.
   * @param {number} newUserData.genderId - FK to the gender catalog.
   * @returns {Promise<{ status: string }>} Result object with a success status message.
   * @throws {Boom} Throws `Boom.badRequest` if no data is provided,
   * `Boom.notFound` if the user does not exist, or a wrapped Boom error if
   * the update fails.
   */
  async updateOne(userId, newUserData) {

    if (!newUserData) {
      throw Boom.badRequest('No data provided');
    }

    try {
      const existingUser = await User.findOne({ where: { id: userId } });

      if (!existingUser) {
        throw Boom.notFound('User not found');
      }

      const [updatedRows] = await User.update(
        {
          username: newUserData.username,
          firstName: newUserData.firstName,
          lastName: newUserData.lastName,
          documentTypeId: newUserData.documentTypeId,
          documentNumber: newUserData.documentNumber,
          municipalityId: newUserData.municipalityId,
          roleId: newUserData.roleId,
          academicLevelId: newUserData.academicLevelId,
          email: newUserData.email,
          status: newUserData.status,
          genderId: newUserData.genderId,
        },
        { where: { id: userId } }
      );

      if (!updatedRows) {
        throw Boom.notFound('User not found');
      }

      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update user' });
    }
  }

  /**
   * Deletes a user by id.
   *
   * @async
   * @param {number} userId - Id of the user to delete.
   * @returns {Promise<{ status: string }>} Result object with a success status message.
   * @throws {Boom} Throws `Boom.badRequest` if no user ID is provided,
   * `Boom.notFound` if the user does not exist, or a wrapped Boom error if
   * deletion fails.
   */
  async deleteOne(userId) {

    if (!userId) {
      throw Boom.badRequest('No user ID provided');
    }

    try {
      const deletedRows = await User.destroy({ where: { id: userId } });

      if (!deletedRows) {
        throw Boom.notFound('User not found');
      }

      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete user' });
    }
  }

  /**
   * Retrieves a single user by id, embedding its foreign-key catalog
   * records (document type, municipality, role, academic level, gender)
   * as nested `{ id, name }` objects instead of raw FK integers.
   *
   * @async
   * @param {number} userId - The id of the user to retrieve.
   * @returns {Promise<Object>} The formatted user record.
   * @throws {Boom} Throws `Boom.badRequest` if no user ID is provided,
   * `Boom.notFound` if the user does not exist, or a wrapped Boom error if
   * the lookup fails.
   */
  async listOne(userId) {

    if (!userId) {
      throw Boom.badRequest('No user ID provided');
    }

    try {
      const theUser = await User.findOne({
        where: { id: userId },
        include: UserServices.CATALOG_INCLUDES,
      });

      if (!theUser) {
        throw Boom.notFound('User not found');
      }

      return UserServices._formatUser(theUser);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find user' });
    }
  }

  /**
   * Retrieves every user, ordered by id ascending, embedding each
   * user's foreign-key catalog records as nested `{ id, name }` objects.
   *
   * @async
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   * @throws {Boom} Throws a wrapped Boom error if the lookup fails.
   */
  async listAll() {

    try {
      const allUsers = await User.findAll({
        order: [['id', 'ASC']],
        include: UserServices.CATALOG_INCLUDES,
      });

      const records = allUsers.map(UserServices._formatUser);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find users' });
    }
  }

  // ==========================================================
  // STATIC UTILITIES
  // ==========================================================

  /**
   * The set of Sequelize includes shared by `listOne` and `listAll` to embed
   * each foreign-key catalog record as its full row (`id` + `name`), so the
   * response can be reshaped into nested objects rather than bare FK ids.
   *
   * @static
   * @type {Array<Object>}
   */
  static CATALOG_INCLUDES = [
    { model: DocumentType, as: 'documentType', attributes: ['id', 'name'] },
    { model: Municipality, as: 'municipality', attributes: ['id', 'name'] },
    { model: Role, as: 'role', attributes: ['id', 'name'] },
    { model: AcademicLevel, as: 'academicLevel', attributes: ['id', 'name'] },
    { model: Gender, as: 'gender', attributes: ['id', 'name'] },
  ];

  /**
   * Reshapes a User Sequelize instance (with its catalog associations
   * eagerly loaded via `CATALOG_INCLUDES`) into a plain object where the
   * raw FK ids (`documentTypeId`, `municipalityId`, `roleId`,
   * `academicLevelId`, `genderId`) are replaced by nested `{ id, name }`
   * objects. Also strips the password hash, since none of these responses
   * should ever leak it.
   *
   * @private
   * @static
   * @param {User} user - The Sequelize User instance to format.
   * @returns {Object} The formatted, plain user object.
   */
  static _formatUser(user) {
    const {
      password,
      documentTypeId,
      municipalityId,
      roleId,
      academicLevelId,
      genderId,
      documentType,
      municipality,
      role,
      academicLevel,
      gender,
      ...rest
    } = user.toJSON();

    return {
      ...rest,
      documentType: documentType ?? null,
      municipality: municipality ?? null,
      role: role ?? null,
      academicLevel: academicLevel ?? null,
      gender: gender ?? null,
    };
  }
}
