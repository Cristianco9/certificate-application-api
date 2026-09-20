// Import the Country data model
import { Country } from '../db/models/country.js';
// Import the Sequelize operators to build advanced query conditions
import { Op } from 'sequelize';
// Boom allows managing possible errors with HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Service class responsible for all business logic and database
 * operations related to the Country entity.
 *
 * Follows the Repository/Service Layer pattern described in AGENTS.md:
 * controllers never talk to Sequelize directly, they always go through
 * this class. Every public method returns an explicit status object
 * (or the requested record) instead of a bare boolean, so the
 * controller decides the proper HTTP response from that status.
 */
export class CountryServices {

  // ==========================================================
  // PUBLIC METHODS (instance)
  // ==========================================================

  /**
 * Creates a new country record in the database.
 *
 * @param {Object} newCountry
 * @param {string} newCountry.name
 * @param {string} [newCountry.iso2Code]
 * @returns {Promise<{status: string}>}
 */
  async createOne(newCountry) {

    try {

      // Verify a country with the same name does not already exist
      const existingCountryByName = await this._findByName(newCountry.name);

      if (existingCountryByName) {
        throw Boom.conflict('El país ya existe con el nombre proporcionado');
      }

      // Normalize the ISO code before persisting it
      const normalizedIso2Code = newCountry.iso2Code
        ? CountryServices.formatIso2Code(newCountry.iso2Code)
        : null;

      // (Optional) Validate that the ISO code is unique
      if (normalizedIso2Code) {
        const existingCountryByIso = await this._findByIso2Code(normalizedIso2Code);

        if (existingCountryByIso) {
          throw Boom.conflict('Ya existe un país con ese código ISO');
        }
      }

      // Create the record (id is generated automatically)
      await Country.create({
        name: newCountry.name,
        iso2Code: normalizedIso2Code
      });

      return { status: 'CREATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, {
        message: 'No es posible crear el país en la base de datos'
      });
    }
  }

  /**
   * Updates an existing country record.
   *
   * @param {number} countryId - The id of the country to update.
   * @param {Object} newCountryData - The new data to persist.
   * @param {string} [newCountryData.name] - The new country name.
   * @param {string} [newCountryData.iso2Code] - The new ISO 3166-1 alpha-2 country code.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async updateOne(countryId, newCountryData) {

    if (!newCountryData) {
      throw Boom.badRequest('No se proporcionaron datos para actualizar');
    }

    try {
      // Verify the country exists before attempting the update
      const existingCountry = await this._findById(countryId);

      if (!existingCountry) {
        throw Boom.notFound('País no encontrado');
      }

      // If a new name is provided, verify it is not already used by another country
      if (newCountryData.name) {
        const countryWithSameName = await this._findByName(newCountryData.name);

        if (countryWithSameName && countryWithSameName.id !== countryId) {
          throw Boom.conflict('Ya existe otro país registrado con ese nombre');
        }
      }

      // Normalize the ISO code before persisting it, when provided
      const normalizedIso2Code = newCountryData.iso2Code
        ? CountryServices.formatIso2Code(newCountryData.iso2Code)
        : newCountryData.iso2Code;

      // Update the record in the database
      const [updatedRows] = await Country.update(
        {
          name: newCountryData.name,
          iso2Code: normalizedIso2Code,
        },
        {
          where: { id: countryId }
        }
      );

      // If no rows were updated, return an error
      if (!updatedRows) {
        throw Boom.notFound('País no encontrado');
      }

      // Return a success response
      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'No es posible actualizar el país en la base de datos' });
    }
  }

  /**
   * Deletes a country record, provided it has no dependent departments.
   *
   * @param {number} countryId - The id of the country to delete.
   * @returns {Promise<{status: string}>} - A status object describing the outcome.
   */
  async deleteOne(countryId) {

    if (!countryId) {
      throw Boom.badRequest('No se proporcionó el identificador del país');
    }

    try {
      // Verify the country exists before attempting the deletion
      const existingCountry = await this._findById(countryId);

      if (!existingCountry) {
        throw Boom.notFound('País no encontrado');
      }

      // Prevent deletion if the country still has associated departments,
      // giving a clearer error than the raw RESTRICT constraint from MySQL
      await this._assertNoAssociatedDepartments(countryId);

      // Destroy the record in the database
      const deletedRows = await Country.destroy({
        where: { id: countryId }
      });

      if (!deletedRows) {
        throw Boom.notFound('País no encontrado');
      }

      // Return a success response
      return { status: 'DELETED SUCCESSFULLY' };

    } catch (error) {
      throw Boom.boomify(error, { message: 'No es posible eliminar el país de la base de datos' });
    }
  }

  /**
   * Retrieves a single country by its id.
   *
   * @param {number} countryId - The id of the country to retrieve.
   * @returns {Promise<Country>} - The country record.
   */
  async listOne(countryId) {

    if (!countryId) {
      throw Boom.badRequest('No se proporcionó el identificador del país');
    }

    try {
      const theCountry = await this._findById(countryId);

      if (!theCountry) {
        throw Boom.notFound('País no encontrado');
      }

      return theCountry;

    } catch (error) {
      throw Boom.boomify(error, { message: 'No es posible encontrar el país' });
    }
  }

  /**
   * Retrieves all country records, ordered alphabetically by name.
   *
   * @returns {Promise<{total: number, records: Country[]}>} An object
   * containing the count of records returned by this request and the list
   * itself, so the controller can surface `total` alongside the collection.
   */
  async listAll() {

    try {
      const allCountries = await Country.findAll({
        order: [['name', 'ASC']]
      });

      return { total: allCountries.length, records: allCountries };

    } catch (error) {
      throw Boom.boomify(error, { message: 'No es posible encontrar los países' });
    }
  }

  /**
   * Searches countries whose name partially matches the given text.
   * Supports the multi-criteria search requirement described in
   * context.md (e.g. 'Nombre parcial').
   *
   * @param {string} partialName - The partial name to search for.
   * @returns {Promise<{total: number, records: Country[]}>} An object
   * containing the count of matching records and the list itself.
   */
  async listByPartialName(partialName) {

    if (!partialName) {
      throw Boom.badRequest('No se proporcionó un texto de búsqueda');
    }

    try {
      const matchingCountries = await Country.findAll({
        where: {
          name: { [Op.like]: `%${partialName}%` }
        },
        order: [['name', 'ASC']]
      });

      return { total: matchingCountries.length, records: matchingCountries };

    } catch (error) {
      throw Boom.boomify(error, { message: 'No es posible buscar los países' });
    }
  }
  /**
   * Retrieves a single country by its ISO 3166-1 alpha-2 code.
   *
   * @param {string} iso2Code - The ISO code to search for.
   * @returns {Promise<Country>} - The matching country record.
   */
  async listByIso2Code(iso2Code) {

    if (!iso2Code) {
      throw Boom.badRequest('No se proporcionó el código ISO del país');
    }

    try {
      const theCountry = await this._findByIso2Code(CountryServices.formatIso2Code(iso2Code));

      if (!theCountry) {
        throw Boom.notFound('País no encontrado con el código ISO proporcionado');
      }

      return theCountry;

    } catch (error) {
      throw Boom.boomify(error, { message: 'No es posible encontrar el país por su código ISO' });
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
   * Finds a country by its primary key.
   *
   * @private
   * @param {number} countryId - The id of the country to find.
   * @returns {Promise<Country|null>} - The country record, or null if not found.
   */
  async _findById(countryId) {
    return Country.findOne({ where: { id: countryId } });
  }

  /**
   * Finds a country by its exact name.
   *
   * @private
   * @param {string} name - The country name to find.
   * @returns {Promise<Country|null>} - The country record, or null if not found.
   */
  async _findByName(name) {
    return Country.findOne({ where: { name } });
  }

  /**
   * Finds a country by its ISO 3166-1 alpha-2 code.
   *
   * @private
   * @param {string} iso2Code - The ISO code to find.
   * @returns {Promise<Country|null>} - The country record, or null if not found.
   */
  async _findByIso2Code(iso2Code) {
    return Country.findOne({ where: { iso2Code } });
  }

  /**
   * Ensures a country has no associated departments before allowing
   * its deletion, since 'departamento' references 'pais' with
   * onDelete: 'RESTRICT' at the database level.
   *
   * @private
   * @param {number} countryId - The id of the country to check.
   * @throws {Boom} - A conflict error when dependent departments exist.
   * @returns {Promise<void>}
   */
  async _assertNoAssociatedDepartments(countryId) {
    const countryWithDepartments = await Country.findOne({
      where: { id: countryId },
      include: [{ association: 'departments', required: true }]
    });

    if (countryWithDepartments) {
      throw Boom.conflict('No es posible eliminar el país porque tiene departamentos asociados');
    }
  }

  // ==========================================================
  // STATIC UTILITIES
  // Stateless helpers that do not depend on instance data, and are
  // therefore exposed as static methods (callable as
  // CountryServices.formatIso2Code(...) without instantiating the class).
  // ==========================================================

  /**
   * Normalizes an ISO 3166-1 alpha-2 country code to the format expected
   * by the countryIso2Code RegEx and stored in the database
   * (trimmed, uppercase, e.g. 'co' -> 'CO').
   *
   * @static
   * @param {string} iso2Code - The raw ISO code to normalize.
   * @returns {string} - The normalized ISO code.
   */
  static formatIso2Code(iso2Code) {
    return iso2Code.trim().toUpperCase();
  }
}
