'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  /**
   * Insert all roles using INSERT IGNORE.
   */
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO rol (nombre_rol, descripcion_rol) VALUES
        ('Máster', 'Usuario con control total del sistema'),
        ('Auxiliar', 'Asistente administrativo con permisos limitados'),
        ('Administrador', 'Gestiona usuarios y configuraciones'),
        ('Secretario', 'Secretario académico que expide certificados'),
        ('Rector', 'Autoridad institucional con supervisión')
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('rol', {
      nombre_rol: ['Máster', 'Auxiliar', 'Administrador', 'Secretario', 'Rector'],
    });
  },
};
