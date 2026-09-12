'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  // ============================================================
  // UP — Create the 'institucion' table
  // ============================================================
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('institucion', {

      // Primary key
      id_institucion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
      },

      // Institution name
      nombre_institucion: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },

      // Institutional code (assigned by the Ministry of Education)
      codigo_institucional: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },

      // Institution address
      direccion_institucion: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },

      // Foreign key to municipio (optional) — SET NULL on delete
      id_municipio_institucion: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'municipio',
          key: 'id_municipio',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      // Institution email
      email_institucion: {
        type: Sequelize.STRING(254),
        allowNull: false,
      },

      // Tax identification number (NIT)
      nit_institucion: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
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
  // DOWN — Drop the 'institucion' table
  // ============================================================
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('institucion');
  },

};
