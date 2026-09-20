// Import the Municipality data model
import { Municipality } from '../db/models/municipality.js';
// Import the Department model
import { Department } from '../db/models/department.js';
// Import the models that reference Municipality, needed to enforce the delete-guard business rules
import { Institution } from '../db/models/institution.js';
import { Student } from '../db/models/student.js';
import { User } from '../db/models/user.js';
import { CertificateSignature } from '../db/models/certificateSignature.js';
// Import the Sequelize operators to build advanced query conditions
import { Op } from 'sequelize';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Municipality (municipio) entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 *
 * Note: the 'municipio' table itself does not carry a unique database
 * constraint on 'nombre_municipio' (see
 * migrations/20260707180732-municipality.cjs), only the foreign key to
 * 'departamento'. Mirroring the approach taken in DepartmentServices,
 * this service enforces name uniqueness scoped to the parent
 * department as a business rule at the service layer.
 *
 * Municipality is one of the most widely referenced catalog entities
 * in the domain: 'estudiante', 'usuario' and 'firma_certificado' point
 * to it with onDelete: 'RESTRICT' (hard constraints), while
 * 'institucion' points to it with onDelete: 'SET NULL' (soft). The
 * deletion guard below checks all four.
 *
 * Every method that returns a Municipality record (listOne, listAll,
 * listByPartialName, listByDepartment) embeds its parent department as
 * a nested { id, name } object under 'department', rather than
 * exposing the raw 'departmentId' foreign key integer.
 */
export class MunicipalityServices {

  // ==========================================================
  // PUBLIC METHODS (instance)
  // ==========================================================

  /**
   * Creates a new municipality record in the database.
   *
   * @param {Object} newMunicipality
   * @param {string} newMunicipality.name
   * @param {number} newMunicipality.departmentId
   * @returns {Promise<{status: string}>}
   */
  async createOne(newMunicipality) {

    try {

      // Normalize the name before persisting it (trim surrounding whitespace)
      const normalizedName = MunicipalityServices.formatName(newMunicipality.name);

      // Verify a municipality with the same name does not already exist
      // for the given department
      const existingMunicipality = await this._findByNameAndDepartment(normalizedName, newMunicipality.departmentId);

      if (existingMunicipality) {
        throw Boom.conflict('A municipality with the provided name already exists for that department');
      }

      // Create the record (id is generated automatically)
      await Municipality.create({
        name: normalizedName,
        departmentId: newMunicipality.departmentId,
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'Unable to create the municipality in the database'
      });
    }
  }

  /**
   * Updates an existing municipality record.
   *
   * @param {number} municipalityId - The id of the municipality to update.
   * @param {Object} newMunicipalityData - The new data to persist.
   * @param {string} [newMunicipalityData.name] - The new municipality name.
   * @param {number} [newMunicipalityData.departmentId] - The new parent department id.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async updateOne(municipalityId, newMunicipalityData) {

    if (!newMunicipalityData) {
      throw Boom.badRequest('No data was provided to update');
    }

    try {
      // Verify the municipality exists before attempting the update
      const existingMunicipality = await this._findById(municipalityId);

      if (!existingMunicipality) {
        throw Boom.notFound('Municipality not found');
      }

      // Normalize the name before persisting it, when provided
      const normalizedName = newMunicipalityData.name
        ? MunicipalityServices.formatName(newMunicipalityData.name)
        : newMunicipalityData.name;

      // If the name and/or the parent department changes, verify the
      // resulting combination is not already used by another municipality
      if (normalizedName || newMunicipalityData.departmentId) {
        const municipalityWithSameKey = await this._findByNameAndDepartment(
          normalizedName ?? existingMunicipality.name,
          newMunicipalityData.departmentId ?? existingMunicipality.departmentId
        );

        if (municipalityWithSameKey && municipalityWithSameKey.id !== municipalityId) {
          throw Boom.conflict('Another municipality already exists with that name for that department');
        }
      }

      // Update the record in the database
      const [updatedRows] = await Municipality.update(
        {
          name: normalizedName,
          departmentId: newMunicipalityData.departmentId,
        },
        {
          where: { id: municipalityId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('Municipality not found');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to update the municipality in the database' });
    }
  }

  /**
   * Deletes a municipality record, provided it has no associated
   * students, users, certificate signatures, or institutions.
   *
   * @param {number} municipalityId - The id of the municipality to delete.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async deleteOne(municipalityId) {

    if (!municipalityId) {
      throw Boom.badRequest('No municipality identifier was provided');
    }

    try {
      // Verify the municipality exists before attempting the deletion
      const existingMunicipality = await this._findById(municipalityId);

      if (!existingMunicipality) {
        throw Boom.notFound('Municipality not found');
      }

      // Prevent deletion if the municipality still has associated
      // students, users, or certificate signatures, giving a clearer
      // error than the raw RESTRICT constraint from MySQL
      await this._assertNoAssociatedStudents(municipalityId);
      await this._assertNoAssociatedUsers(municipalityId);
      await this._assertNoAssociatedCertificateSignatures(municipalityId);

      // Also prevent deletion if it still has associated institutions.
      // This is a business-rule guard rather than a hard database
      // constraint, since 'institucion' references 'municipio' with
      // SET NULL.
      await this._assertNoAssociatedInstitutions(municipalityId);

      // Destroy the record in the database
      const deletedRows = await Municipality.destroy({
        where: { id: municipalityId }
      });

      if (!deletedRows) {
        throw Boom.notFound('Municipality not found');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to delete the municipality from the database' });
    }
  }

  /**
   * Retrieves a single municipality by its id, embedding its parent
   * department as a nested { id, name } object.
   *
   * @param {number} municipalityId - The id of the municipality to retrieve.
   * @returns {Promise<Object>} - The formatted municipality record.
   */
  async listOne(municipalityId) {

    if (!municipalityId) {
      throw Boom.badRequest('No municipality identifier was provided');
    }

    try {
      const theMunicipality = await Municipality.findOne({
        where: { id: municipalityId },
        include: MunicipalityServices.DEPARTMENT_INCLUDE,
      });

      if (!theMunicipality) {
        throw Boom.notFound('Municipality not found');
      }

      return MunicipalityServices._formatMunicipality(theMunicipality);

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the municipality' });
    }
  }

  /**
   * Retrieves all municipality records, ordered alphabetically by name,
   * each with its parent department embedded as a nested { id, name } object.
   *
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allMunicipalities = await Municipality.findAll({
        order: [['name', 'ASC']],
        include: MunicipalityServices.DEPARTMENT_INCLUDE,
      });

      const records = allMunicipalities.map(MunicipalityServices._formatMunicipality);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the municipalities' });
    }
  }

  /**
   * Searches municipalities whose name partially matches the given text,
   * each with its parent department embedded as a nested { id, name } object.
   * Supports the multi-criteria search requirement described in
   * context.md (e.g. 'Nombre parcial').
   *
   * @param {string} partialName - The partial name to search for.
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByPartialName(partialName) {

    if (!partialName) {
      throw Boom.badRequest('No search text was provided');
    }

    try {
      const matchingMunicipalities = await Municipality.findAll({
        where: {
          name: { [Op.like]: `%${partialName}%` }
        },
        order: [['name', 'ASC']],
        include: MunicipalityServices.DEPARTMENT_INCLUDE,
      });

      const records = matchingMunicipalities.map(MunicipalityServices._formatMunicipality);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to search the municipalities' });
    }
  }

  /**
   * Retrieves all municipalities belonging to a given department, each
   * with its parent department embedded as a nested { id, name } object.
   * Useful for cascading selects in the UI (country -> department ->
   * municipality).
   *
   * @param {number} departmentId - The id of the department.
   * @returns {Promise<{total: number, records: Object[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByDepartment(departmentId) {

    if (!departmentId) {
      throw Boom.badRequest('No department identifier was provided');
    }

    try {
      const municipalitiesByDepartment = await Municipality.findAll({
        where: { departmentId },
        order: [['name', 'ASC']],
        include: MunicipalityServices.DEPARTMENT_INCLUDE,
      });

      const records = municipalitiesByDepartment.map(MunicipalityServices._formatMunicipality);

      return { total: records.length, records };

    } catch (error) {
      throw Boom.boomify(error, { message: 'Unable to find the municipalities for the given department' });
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
   * Finds a municipality by its primary key. Used internally by write
   * operations (updateOne/deleteOne) that only need to check existence,
   * so it intentionally does NOT eager-load the department association —
   * callers that need the formatted, nested-department shape should go
   * through listOne() instead.
   *
   * @private
   * @param {number} municipalityId - The id of the municipality to find.
   * @returns {Promise<Municipality|null>} - The municipality record, or null if not found.
   */
  async _findById(municipalityId) {
    return Municipality.findOne({ where: { id: municipalityId } });
  }

  /**
   * Finds a municipality by its name, scoped to a specific department.
   * This mirrors the business-level uniqueness rule described in the
   * class JSDoc, since the database itself does not enforce it.
   *
   * @private
   * @param {string} name - The municipality name to find.
   * @param {number} departmentId - The id of the parent department.
   * @returns {Promise<Municipality|null>} - The municipality record, or null if not found.
   */
  async _findByNameAndDepartment(name, departmentId) {
    return Municipality.findOne({ where: { name, departmentId } });
  }

  /**
   * Ensures a municipality has no associated students before allowing
   * its deletion, since 'estudiante' references 'municipio' with
   * onDelete: 'RESTRICT' at the database level.
   *
   * @private
   * @param {number} municipalityId - The id of the municipality to check.
   * @throws {Boom} - A conflict error when dependent students exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedStudents(municipalityId) {
    const associatedStudent = await Student.findOne({
      where: { municipalityId }
    });

    if (associatedStudent) {
      throw Boom.conflict('The municipality cannot be deleted because it has associated students');
    }
  }

  /**
   * Ensures a municipality has no associated users before allowing its
   * deletion, since 'usuario' references 'municipio' with
   * onDelete: 'RESTRICT' at the database level.
   *
   * @private
   * @param {number} municipalityId - The id of the municipality to check.
   * @throws {Boom} - A conflict error when dependent users exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedUsers(municipalityId) {
    const associatedUser = await User.findOne({
      where: { municipalityId }
    });

    if (associatedUser) {
      throw Boom.conflict('The municipality cannot be deleted because it has associated users');
    }
  }

  /**
   * Ensures a municipality has no associated certificate signatures
   * before allowing its deletion, since 'firma_certificado' references
   * 'municipio' with onDelete: 'RESTRICT' at the database level.
   *
   * @private
   * @param {number} municipalityId - The id of the municipality to check.
   * @throws {Boom} - A conflict error when dependent certificate signatures exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedCertificateSignatures(municipalityId) {
    const associatedSignature = await CertificateSignature.findOne({
      where: { municipalityId }
    });

    if (associatedSignature) {
      throw Boom.conflict('The municipality cannot be deleted because it has associated certificate signatures');
    }
  }

  /**
   * Ensures a municipality has no associated institutions before
   * allowing its deletion. This is a business-rule guard rather than a
   * hard database constraint, since 'institucion' references
   * 'municipio' with onDelete: 'SET NULL'.
   *
   * @private
   * @param {number} municipalityId - The id of the municipality to check.
   * @throws {Boom} - A conflict error when dependent institutions exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedInstitutions(municipalityId) {
    const associatedInstitution = await Institution.findOne({
      where: { municipalityId }
    });

    if (associatedInstitution) {
      throw Boom.conflict('The municipality cannot be deleted because it has associated institutions');
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
   * The Sequelize include shared by every read method that needs to
   * embed the parent department as a nested object rather than a raw
   * departmentId integer.
   *
   * @static
   */
  static DEPARTMENT_INCLUDE = [
    { model: Department, as: 'department', attributes: ['id', 'name'] },
  ];

  /**
   * Reshapes a Municipality Sequelize instance (with its 'department'
   * association eagerly loaded via DEPARTMENT_INCLUDE) into a plain
   * object where the raw 'departmentId' foreign key is replaced by a
   * nested { id, name } object under 'department'.
   *
   * @private
   * @static
   * @param {Municipality} municipality - The Sequelize Municipality instance to format.
   * @returns {Object} - The formatted, plain municipality object.
   */
  static _formatMunicipality(municipality) {
    const { departmentId, department, ...rest } = municipality.toJSON();

    return {
      ...rest,
      department: department ?? null,
    };
  }

  /**
   * Normalizes a municipality name to the format expected by the
   * municipalityName RegEx and stored in the database (trimmed, so
   * accidental leading/trailing whitespace never creates a
   * near-duplicate entry).
   *
   * @static
   * @param {string} name - The raw municipality name to normalize.
   * @returns {string} - The normalized municipality name.
   */
  static formatName(name) {
    return name.trim();
  }
}
