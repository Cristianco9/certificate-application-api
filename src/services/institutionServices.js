// Import the Institution data model
import { Institution } from '../db/models/institution.js';

// Import the Municipality data model
import { Municipality } from '../db/models/municipality.js';

// Import the models that reference Institution, needed to enforce
// deletion business rules.
import { Certificate } from '../db/models/certificate.js';
import { Group } from '../db/models/group.js';

// Import Sequelize operators to build advanced query conditions
import { Op } from 'sequelize';

// Boom provides HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Institution entity.
 *
 * The service follows the Repository/Service Layer pattern:
 * controllers never interact directly with Sequelize. All database
 * operations are handled through this service.
 *
 * Read operations return institutions with their municipality embedded
 * as a nested { id, name } object instead of exposing the raw
 * municipalityId foreign key.
 */
export class InstitutionServices {

  // ==========================================================
  // PUBLIC METHODS
  // ==========================================================

  /**
   * Creates a new institution.
   *
   * @param {Object} newInstitution
   * @param {string} newInstitution.name
   * @param {string} newInstitution.institutionalCode
   * @param {string} newInstitution.address
   * @param {number|null} newInstitution.municipalityId
   * @param {string} newInstitution.email
   * @param {string} newInstitution.nitId
   *
   * @returns {Promise<{status: string}>}
   */
  async createOne(newInstitution) {
    if (!newInstitution) {
      throw Boom.badRequest('No institution data was provided');
    }

    try {
      // Normalize the institution name before persisting it.
      const normalizedName = InstitutionServices.formatName(
        newInstitution.name
      );

      // Verify that the institution name is not already registered.
      const existingInstitutionByName =
        await this._findByName(normalizedName);

      if (existingInstitutionByName) {
        throw Boom.conflict(
          'An institution with the provided name already exists'
        );
      }

      // Verify that the institutional code is not already registered.
      const existingInstitutionByCode =
        await this._findByInstitutionalCode(
          newInstitution.institutionalCode
        );

      if (existingInstitutionByCode) {
        throw Boom.conflict(
          'An institution with the provided institutional code already exists'
        );
      }

      // Verify that the NIT is not already registered.
      const existingInstitutionByNit =
        await this._findByNit(newInstitution.nitId);

      if (existingInstitutionByNit) {
        throw Boom.conflict(
          'An institution with the provided NIT already exists'
        );
      }

      // Create the institution.
      await Institution.create({
        name: normalizedName,
        institutionalCode: newInstitution.institutionalCode,
        address: newInstitution.address,
        municipalityId: newInstitution.municipalityId,
        email: newInstitution.email,
        nitId: newInstitution.nitId,
      });

      return {
        status: 'CREATED SUCCESSFULLY',
      };
    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the institution in the database',
      });
    }
  }

  /**
   * Updates an existing institution.
   *
   * @param {number|string} institutionId
   * @param {Object} newInstitutionData
   *
   * @returns {Promise<{status: string}>}
   */
  async updateOne(institutionId, newInstitutionData) {
    if (!institutionId) {
      throw Boom.badRequest('No institution identifier was provided');
    }

    if (!newInstitutionData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify that the institution exists.
      const existingInstitution = await this._findById(institutionId);

      if (!existingInstitution) {
        throw Boom.notFound('Institution not found');
      }

      // Normalize the name only when it is provided.
      const normalizedName = newInstitutionData.name
        ? InstitutionServices.formatName(newInstitutionData.name)
        : undefined;

      // Check name uniqueness only when the name changes.
      if (normalizedName) {
        const institutionWithSameName =
          await this._findByName(normalizedName);

        if (
          institutionWithSameName &&
          institutionWithSameName.id !== Number(institutionId)
        ) {
          throw Boom.conflict(
            'Another institution already exists with the provided name'
          );
        }
      }

      // Check institutional-code uniqueness only when it changes.
      if (newInstitutionData.institutionalCode) {
        const institutionWithSameCode =
          await this._findByInstitutionalCode(
            newInstitutionData.institutionalCode
          );

        if (
          institutionWithSameCode &&
          institutionWithSameCode.id !== Number(institutionId)
        ) {
          throw Boom.conflict(
            'Another institution already exists with the provided institutional code'
          );
        }
      }

      // Check NIT uniqueness only when it changes.
      if (newInstitutionData.nitId) {
        const institutionWithSameNit =
          await this._findByNit(newInstitutionData.nitId);

        if (
          institutionWithSameNit &&
          institutionWithSameNit.id !== Number(institutionId)
        ) {
          throw Boom.conflict(
            'Another institution already exists with the provided NIT'
          );
        }
      }

      // Build the update object dynamically so omitted fields are
      // not overwritten.
      const updateData = {};

      if (normalizedName !== undefined) {
        updateData.name = normalizedName;
      }

      if (newInstitutionData.institutionalCode !== undefined) {
        updateData.institutionalCode =
          newInstitutionData.institutionalCode;
      }

      if (newInstitutionData.address !== undefined) {
        updateData.address = newInstitutionData.address;
      }

      if (newInstitutionData.municipalityId !== undefined) {
        updateData.municipalityId =
          newInstitutionData.municipalityId;
      }

      if (newInstitutionData.email !== undefined) {
        updateData.email = newInstitutionData.email;
      }

      if (newInstitutionData.nitId !== undefined) {
        updateData.nitId = newInstitutionData.nitId;
      }

      // Update the institution.
      const [updatedRows] = await Institution.update(
        updateData,
        {
          where: {
            id: institutionId,
          },
        }
      );

      if (!updatedRows) {
        throw Boom.notFound('Institution not found');
      }

      return {
        status: 'UPDATED SUCCESSFULLY',
      };
    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to update the institution in the database',
      });
    }
  }

  /**
   * Deletes an institution.
   *
   * An institution cannot be deleted when it has associated
   * certificates or groups.
   *
   * @param {number|string} institutionId
   * @returns {Promise<{status: string}>}
   */
  async deleteOne(institutionId) {
    if (!institutionId) {
      throw Boom.badRequest(
        'No institution identifier was provided'
      );
    }

    try {
      // Verify that the institution exists.
      const existingInstitution =
        await this._findById(institutionId);

      if (!existingInstitution) {
        throw Boom.notFound('Institution not found');
      }

      // Prevent deletion when certificates are associated.
      await this._assertNoAssociatedCertificates(institutionId);

      // Prevent deletion when groups are associated.
      await this._assertNoAssociatedGroups(institutionId);

      // Delete the institution.
      const deletedRows = await Institution.destroy({
        where: {
          id: institutionId,
        },
      });

      if (!deletedRows) {
        throw Boom.notFound('Institution not found');
      }

      return {
        status: 'DELETED SUCCESSFULLY',
      };
    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to delete the institution from the database',
      });
    }
  }

  /**
   * Retrieves a single institution by its id.
   *
   * The municipality is embedded as:
   *
   * {
   *   id: number,
   *   name: string
   * }
   *
   * @param {number|string} institutionId
   * @returns {Promise<Object>}
   */
  async listOne(institutionId) {
    if (!institutionId) {
      throw Boom.badRequest(
        'No institution identifier was provided'
      );
    }

    try {
      const theInstitution = await Institution.findOne({
        where: {
          id: institutionId,
        },
        include: InstitutionServices.MUNICIPALITY_INCLUDE,
      });

      if (!theInstitution) {
        throw Boom.notFound('Institution not found');
      }

      return InstitutionServices._formatInstitution(
        theInstitution
      );
    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to find the institution',
      });
    }
  }

  /**
   * Retrieves all institutions ordered alphabetically by name.
   *
   * Each institution contains its municipality as a nested
   * { id, name } object.
   *
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {
    try {
      const allInstitutions = await Institution.findAll({
        order: [['name', 'ASC']],
        include: InstitutionServices.MUNICIPALITY_INCLUDE,
      });

      const records = allInstitutions.map(
        InstitutionServices._formatInstitution
      );

      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to find the institutions',
      });
    }
  }

  /**
   * Searches institutions whose name partially matches the
   * provided text.
   *
   * @param {string} partialName
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByPartialName(partialName) {
    if (!partialName) {
      throw Boom.badRequest('No search text was provided');
    }

    try {
      const matchingInstitutions = await Institution.findAll({
        where: {
          name: {
            [Op.like]: `%${partialName}%`,
          },
        },
        order: [['name', 'ASC']],
        include: InstitutionServices.MUNICIPALITY_INCLUDE,
      });

      const records = matchingInstitutions.map(
        InstitutionServices._formatInstitution
      );

      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to search the institutions',
      });
    }
  }

  /**
   * Retrieves an institution by its institutional code.
   *
   * @param {string} institutionalCode
   * @returns {Promise<Object>}
   */
  async listByInstitutionalCode(institutionalCode) {
    if (!institutionalCode) {
      throw Boom.badRequest(
        'No institutional code was provided'
      );
    }

    try {
      const theInstitution = await Institution.findOne({
        where: {
          institutionalCode,
        },
        include: InstitutionServices.MUNICIPALITY_INCLUDE,
      });

      if (!theInstitution) {
        throw Boom.notFound(
          'Institution not found with the provided institutional code'
        );
      }

      return InstitutionServices._formatInstitution(
        theInstitution
      );
    } catch (error) {
      throw Boom.boomify(error, {
        message:
          'Unable to find the institution by its institutional code',
      });
    }
  }

  /**
   * Retrieves an institution by its NIT.
   *
   * @param {string} nitId
   * @returns {Promise<Object>}
   */
  async listByNit(nitId) {
    if (!nitId) {
      throw Boom.badRequest('No NIT was provided');
    }

    try {
      const theInstitution = await Institution.findOne({
        where: {
          nitId,
        },
        include: InstitutionServices.MUNICIPALITY_INCLUDE,
      });

      if (!theInstitution) {
        throw Boom.notFound(
          'Institution not found with the provided NIT'
        );
      }

      return InstitutionServices._formatInstitution(
        theInstitution
      );
    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to find the institution by its NIT',
      });
    }
  }

 /**
   * Retrieves all institutions belonging to a municipality.
   *
   * Each institution contains its municipality as a nested
   * { id, name } object.
   *
   * @param {number|string} municipalityId
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByMunicipality(municipalityId) {
    if (!municipalityId) {
      throw Boom.badRequest(
        'No municipality identifier was provided'
      );
    }

    try {
      const institutionsByMunicipality =
        await Institution.findAll({
          where: {
            municipalityId,
          },
          order: [['name', 'ASC']],
          include: InstitutionServices.MUNICIPALITY_INCLUDE,
        });

      const records = institutionsByMunicipality.map(
        InstitutionServices._formatInstitution
      );

      return { total: records.length, records };
    } catch (error) {
      throw Boom.boomify(error, {
        message:
          'Unable to find the institutions for the given municipality',
      });
    }
  }

  // ==========================================================
  // PRIVATE HELPERS
  // ==========================================================

  /**
   * Finds an institution by its primary key.
   *
   * This method intentionally does not eager-load the municipality
   * because it is used internally for existence checks.
   *
   * @param {number|string} institutionId
   * @returns {Promise<Institution|null>}
   */
  async _findById(institutionId) {
    return Institution.findOne({
      where: {
        id: institutionId,
      },
    });
  }

  /**
   * Finds an institution by its name.
   *
   * @param {string} name
   * @returns {Promise<Institution|null>}
   */
  async _findByName(name) {
    return Institution.findOne({
      where: {
        name,
      },
    });
  }

  /**
   * Finds an institution by its institutional code.
   *
   * @param {string} institutionalCode
   * @returns {Promise<Institution|null>}
   */
  async _findByInstitutionalCode(institutionalCode) {
    return Institution.findOne({
      where: {
        institutionalCode,
      },
    });
  }

  /**
   * Finds an institution by its NIT.
   *
   * @param {string} nitId
   * @returns {Promise<Institution|null>}
   */
  async _findByNit(nitId) {
    return Institution.findOne({
      where: {
        nitId,
      },
    });
  }

  /**
   * Ensures an institution has no associated certificates
   * before allowing deletion.
   *
   * @param {number|string} institutionId
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedCertificates(institutionId) {
    const associatedCertificate = await Certificate.findOne({
      where: {
        institutionId,
      },
    });

    if (associatedCertificate) {
      throw Boom.conflict(
        'The institution cannot be deleted because it has associated certificates'
      );
    }
  }

  /**
   * Ensures an institution has no associated groups
   * before allowing deletion.
   *
   * @param {number|string} institutionId
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedGroups(institutionId) {
    const associatedGroup = await Group.findOne({
      where: {
        institutionId,
      },
    });

    if (associatedGroup) {
      throw Boom.conflict(
        'The institution cannot be deleted because it has associated groups'
      );
    }
  }

  // ==========================================================
  // STATIC UTILITIES
  // ==========================================================

  /**
   * Sequelize association used by every read operation.
   *
   * Only the municipality id and name are exposed.
   */
  static MUNICIPALITY_INCLUDE = [
    {
      model: Municipality,
      as: 'municipality',
      attributes: ['id', 'name'],
    },
  ];

  /**
   * Converts an Institution Sequelize instance into a plain
   * object and replaces municipalityId with the nested
   * municipality object.
   *
   * Example:
   *
   * {
   *   id: 1,
   *   name: 'Institution',
   *   municipality: {
   *     id: 5,
   *     name: 'Tuluá'
   *   }
   * }
   *
   * @param {Institution} institution
   * @returns {Object}
   */
  static _formatInstitution(institution) {
    const {
      municipalityId,
      municipality,
      ...rest
    } = institution.toJSON();

    return {
      ...rest,
      municipality: municipality ?? null,
    };
  }

  /**
   * Normalizes an institution name before storing it.
   *
   * @param {string} name
   * @returns {string}
   */
  static formatName(name) {
    return name.trim();
  }
}
