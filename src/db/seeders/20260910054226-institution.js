'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  /**
   * Inserts the real institution using INSERT IGNORE.
   * id_municipio_institucion = 1083 corresponds to Roldanillo (Valle del Cauca).
   */
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO institucion (
        nombre_institucion,
        codigo_institucional,
        direccion_institucion,
        id_municipio_institucion,
        email_institucion,
        nit_institucion
      ) VALUES (
        'Institución educativa Nuestra Señora de Chiquinquirá',
        '176622000076',
        'Calle 4 # 5 - 38 Roldanillo',
        1083,
        'nuestraroldanillo@secvalledelcauca.gov.co',
        '891900837-2'
      )
    `);
  },

  /**
   * Removes the inserted institution.
   */
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('institucion', {
      nit_institucion: '891900837-2',
    });
  },
};
