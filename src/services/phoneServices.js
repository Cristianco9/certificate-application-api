// Import the Phone data model
import { Phone } from '../db/models/phone.js';
// Import the four bridge models through which a phone can be linked to
// its single owner (see the OWNER_BRIDGES static config below)
import { UserPhone } from '../db/models/userPhone.js';
import { StudentPhone } from '../db/models/studentPhone.js';
import { InstitutionPhone } from '../db/models/institutionPhone.js';
import { CertificateRecipientPhone } from '../db/models/certificateRecipientPhone.js';
// Import the Sequelize operators to build advanced query conditions
import { Op } from 'sequelize';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Phone (telefono) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * Phone is a shared catalog table linked to its owner (User, Student,
 * Institution, or CertificateRecipient) through four separate bridge
 * tables that are all modelled as many-to-many at the database level.
 * As documented in models/index.js, the real business rule is stricter
 * than the schema: a given phone row must only ever be linked through
 * ONE of the four bridge tables, never more than one. Since MySQL
 * cannot express 'exclusive-or across four tables' declaratively, this
 * service is where that invariant is actually enforced, via
 * _assertPhoneIsUnowned before every new link is created.
 */
export class PhoneServices {

  // ==========================================================
  // PUBLIC METHODS (instance) — Phone record CRUD
  // ==========================================================

  /**
   * Creates a new phone record in the database. The record starts
   * unowned; use linkPhoneToOwner to associate it with a User, Student,
   * Institution, or CertificateRecipient.
   *
   * @param {Object} newPhone
   * @param {string} newPhone.number
   * @returns {Promise<{status: string}>}
   */
  async createOne(newPhone) {

    try {

      // Normalize the number before persisting it (trim surrounding whitespace)
      const normalizedNumber = PhoneServices.formatNumber(newPhone.number);

      // Verify a phone with the same number does not already exist
      const existingPhone = await this._findByNumber(normalizedNumber);

      if (existingPhone) {
        throw Boom.conflict('A phone already exists with the provided number');
      }

      // Create the record (id is generated automatically)
      await Phone.create({
        number: normalizedNumber,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the phone in the database'
      });
    }
  }

  /**
   * Updates an existing phone record.
   *
   * @param {number} phoneId - The id of the phone to update.
   * @param {Object} newPhoneData - The new data to persist.
   * @param {string} newPhoneData.number - The new phone number.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async updateOne(phoneId, newPhoneData) {

    if (!newPhoneData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the phone exists before attempting the update
      const existingPhone = await this._findById(phoneId);

      if (!existingPhone) {
        throw Boom.notFound('Phone not found');
      }

      // Normalize the number before persisting it, when provided
      const normalizedNumber = newPhoneData.number
        ? PhoneServices.formatNumber(newPhoneData.number)
        : newPhoneData.number;

      // If a new number is provided, verify it is not already used by
      // another phone
      if (normalizedNumber) {
        const phoneWithSameNumber = await this._findByNumber(normalizedNumber);

        if (phoneWithSameNumber && phoneWithSameNumber.id !== phoneId) {
          throw Boom.conflict('Another phone is already registered with that number');
        }
      }

      // Update the record in the database
      const [updatedRows] = await Phone.update(
        {
          number: normalizedNumber,
        },
        {
          where: { id: phoneId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Phone not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the phone in the database' });
    }
  }

  /**
   * Deletes a phone record. Unlike most other catalog entities, no
   * associated-records guard is required here: all four bridge tables
   * (usuario_telefono, estudiante_telefono, institucion_telefono,
   * receptor_certificado_telefono) declare onDelete: 'CASCADE' on the
   * phone foreign key, so MySQL removes the ownership link
   * automatically when the phone itself is deleted.
   *
   * @param {number} phoneId - The id of the phone to delete.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async deleteOne(phoneId) {

    if (!phoneId) {
      throw Boom.badRequest('No phone identifier was provided');
    }

    try {
      // Verify the phone exists before attempting the deletion
      const existingPhone = await this._findById(phoneId);

      if (!existingPhone) {
        throw Boom.notFound('Phone not found');
      }

      // Destroy the record in the database; the CASCADE constraints on
      // the four bridge tables clean up any ownership link automatically
      const deletedRows = await Phone.destroy({
        where: { id: phoneId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Phone not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the phone from the database' });
    }
  }

  /**
   * Retrieves a single phone by its id.
   *
   * @param {number} phoneId - The id of the phone to retrieve.
   * @returns {Promise<Phone>} - The phone record.
   */
  async listOne(phoneId) {

    if (!phoneId) {
      throw Boom.badRequest('No phone identifier was provided');
    }

    try {
      const thePhone = await this._findById(phoneId);

      if (!thePhone) {
        throw Boom.notFound('Phone not found');
      }

      return thePhone;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the phone' });
    }
  }

  /**
   * Retrieves all phone records, ordered by their id.
   *
   * @returns {Promise<{total: number, records: Phone[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allPhones = await Phone.findAll({
        order: [['id', 'ASC']]
      });

      return { total: allPhones.length, records: allPhones };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the phones' });
    }
  }

  /**
   * Retrieves a single phone by its exact number.
   *
   * @param {string} number - The phone number to search for.
   * @returns {Promise<Phone>} - The matching phone record.
   */
  async listByNumber(number) {

    if (!number) {
      throw Boom.badRequest('No phone number was provided');
    }

    try {
      const thePhone = await this._findByNumber(number);

      if (!thePhone) {
        throw Boom.notFound('Phone not found with the provided number');
      }

      return thePhone;

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the phone by its number' });
    }
  }

  /**
   * Searches phones whose number partially matches the given text.
   * Useful for autocomplete-style search fields.
   *
   * @param {string} partialNumber - The partial number to search for.
   * @returns {Promise<{total: number, records: Phone[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByPartialNumber(partialNumber) {

    if (!partialNumber) {
      throw Boom.badRequest('No search text was provided');
    }

    try {
      const matchingPhones = await Phone.findAll({
        where: {
          number: { [Op.like]: `%${partialNumber}%` }
        },
        order: [['id', 'ASC']]
      });

      return { total: matchingPhones.length, records: matchingPhones };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to search the phones' });
    }
  }
  // ==========================================================
  // PUBLIC METHODS (instance) — Ownership management
  // ==========================================================

  /**
   * Links an existing phone to an owner (User, Student, Institution, or
   * CertificateRecipient), by creating the corresponding bridge row.
   * Enforces the single-owner business rule: a phone that is already
   * linked to any owner (of any type) must be unlinked first.
   *
   * @param {number} phoneId - The id of the phone to link.
   * @param {'user'|'student'|'institution'|'certificateRecipient'} ownerType - The type of the owner.
   * @param {number} ownerId - The id of the owner record.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async linkPhoneToOwner(phoneId, ownerType, ownerId) {

    if (!phoneId || !ownerId) {
      throw Boom.badRequest('Both a phone identifier and an owner identifier must be provided');
    }

    try {
      // Verify the phone exists before attempting to link it
      const existingPhone = await this._findById(phoneId);

      if (!existingPhone) {
        throw Boom.notFound('Phone not found');
      }

      // Resolve the bridge configuration for the given owner type
      const bridge = PhoneServices._resolveOwnerBridge(ownerType);

      // Enforce the single-owner rule: reject the link if the phone is
      // already associated with any owner, of any type
      await this._assertPhoneIsUnowned(phoneId);

      // Create the bridge row linking the phone to its new owner
      await bridge.model.create({
        phoneId,
        [bridge.foreignKey]: ownerId,
      });

      return { status: 'LINKED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to link the phone to the owner' });
    }
  }

  /**
   * Unlinks a phone from a given owner, by removing the corresponding
   * bridge row. The phone record itself is preserved and becomes
   * available to be linked to a different owner afterward.
   *
   * @param {number} phoneId - The id of the phone to unlink.
   * @param {'user'|'student'|'institution'|'certificateRecipient'} ownerType - The type of the owner.
   * @param {number} ownerId - The id of the owner record.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async unlinkPhoneFromOwner(phoneId, ownerType, ownerId) {

    if (!phoneId || !ownerId) {
      throw Boom.badRequest('Both a phone identifier and an owner identifier must be provided');
    }

    try {
      // Resolve the bridge configuration for the given owner type
      const bridge = PhoneServices._resolveOwnerBridge(ownerType);

      // Destroy the bridge row linking the phone to that owner
      const deletedRows = await bridge.model.destroy({
        where: { phoneId, [bridge.foreignKey]: ownerId }
      });

      if (!deletedRows) {
        throw Boom.notFound('The phone is not currently linked to the provided owner');
      }

      return { status: 'UNLINKED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to unlink the phone from the owner' });
    }
  }

  /**
   * Retrieves the current owner of a phone, checking all four bridge
   * tables. Since a phone can only ever be linked to a single owner
   * (see the class JSDoc), at most one result is returned.
   *
   * @param {number} phoneId - The id of the phone to check.
   * @returns {Promise<{ownerType: string, ownerId: number}|null>} - The owner descriptor, or null if the phone is unowned.
   */
  async getPhoneOwner(phoneId) {

    if (!phoneId) {
      throw Boom.badRequest('No phone identifier was provided');
    }

    try {
      // Verify the phone exists before checking its owner
      const existingPhone = await this._findById(phoneId);

      if (!existingPhone) {
        throw Boom.notFound('Phone not found');
      }

      return await this._findOwnerLink(phoneId);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the owner of the phone' });
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
   * Finds a phone by its primary key.
   *
   * @private
   * @param {number} phoneId - The id of the phone to find.
   * @returns {Promise<Phone|null>} - The phone record, or null if not found.
   */
  async _findById(phoneId) {
    return Phone.findOne({ where: { id: phoneId } });
  }

  /**
   * Finds a phone by its exact number.
   *
   * @private
   * @param {string} number - The phone number to find.
   * @returns {Promise<Phone|null>} - The phone record, or null if not found.
   */
  async _findByNumber(number) {
    return Phone.findOne({ where: { number } });
  }

  /**
   * Scans all four ownership bridge tables for a link involving the
   * given phone, returning the first one found.
   *
   * @private
   * @param {number} phoneId - The id of the phone to check.
   * @returns {Promise<{ownerType: string, ownerId: number}|null>} - The owner descriptor, or null if unowned.
   */
  async _findOwnerLink(phoneId) {
    for (const [ownerType, bridge] of Object.entries(PhoneServices.OWNER_BRIDGES)) {
      const existingLink = await bridge.model.findOne({ where: { phoneId } });

      if (existingLink) {
        return { ownerType, ownerId: existingLink[bridge.foreignKey] };
      }
    }

    return null;
  }

  /**
   * Ensures a phone is not currently linked to any owner, across all
   * four bridge tables, before a new link is created. This is the
   * enforcement point for the single-owner business rule documented in
   * models/index.js, which the database schema cannot express on its
   * own.
   *
   * @private
   * @param {number} phoneId - The id of the phone to check.
   * @throws {Boom} - A conflict error naming the existing owner type, when one is found.
   * @returns {Promise<void>}
   */
  async _assertPhoneIsUnowned(phoneId) {
    const existingOwner = await this._findOwnerLink(phoneId);

    if (existingOwner) {
      throw Boom.conflict(`The phone is already linked to a ${existingOwner.ownerType} and must be unlinked first`);
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
   * Maps each supported owner type to its bridge model and the foreign
   * key column that identifies the owner within that bridge table. This
   * is the single source of truth for the four ownership relationships,
   * so adding support for a future owner type only requires a new entry
   * here rather than new branching logic throughout the class.
   *
   * @static
   * @type {Object<string, {model: import('sequelize').ModelStatic, foreignKey: string}>}
   */
  static OWNER_BRIDGES = {
    user: { model: UserPhone, foreignKey: 'userId' },
    student: { model: StudentPhone, foreignKey: 'studentId' },
    institution: { model: InstitutionPhone, foreignKey: 'institutionId' },
    certificateRecipient: { model: CertificateRecipientPhone, foreignKey: 'certificateRecipientId' },
  };

  /**
   * Resolves the bridge configuration for a given owner type, throwing
   * a clear Boom error when the type is not one of the four supported
   * owners.
   *
   * @private
   * @static
   * @param {string} ownerType - The owner type to resolve.
   * @throws {Boom} - A bad request error when the owner type is not supported.
   * @returns {{model: import('sequelize').ModelStatic, foreignKey: string}} - The matching bridge configuration.
   */
  static _resolveOwnerBridge(ownerType) {
    const bridge = PhoneServices.OWNER_BRIDGES[ownerType];

    if (!bridge) {
      throw Boom.badRequest(`The owner type must be one of: ${Object.keys(PhoneServices.OWNER_BRIDGES).join(', ')}`);
    }

    return bridge;
  }

  /**
   * Normalizes a phone number to the format expected by the
   * phoneNumber RegEx and stored in the database (trimmed, so
   * accidental leading/trailing whitespace never creates a
   * near-duplicate entry).
   *
   * @static
   * @param {string} number - The raw phone number to normalize.
   * @returns {string} - The normalized phone number.
   */
  static formatNumber(number) {
    return number.trim();
  }
}
