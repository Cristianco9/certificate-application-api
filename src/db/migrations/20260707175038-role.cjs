'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  // ============================================================
  // UP — Create the 'rol' table
  // ============================================================
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rol', {

      // Primary key
      id_rol: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
      },

      // Role name (e.g. 'Máster', 'Auxiliar', 'Administrador', 'Secretario', 'Rector')
      nombre_rol: {
        type: Sequelize.ENUM('Máster', 'Auxiliar', 'Administrador', 'Secretario', 'Rector'),
        allowNull: false,
        unique: true,
      },

      // Role description
      descripcion_rol: {
        type: Sequelize.STRING(70),
        allowNull: false,
      },

      // Creation timestamp
      fecha_creacion: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      // Update timestamp
      fecha_modificacion: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

    });
  },

  // ============================================================
  // DOWN — Drop the 'rol' table
  // ============================================================
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('rol');
  },

};
