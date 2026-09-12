'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  // ============================================================
  // UP — Create the 'receptor_certificado' table
  // ============================================================
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('receptor_certificado', {

      // Primary key
      id_receptor_certificado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
      },

      // Recipient first name
      nombre_receptor_certificado: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      // Recipient middle name (optional)
      segundo_nombre_receptor_certificado: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      // Recipient last name
      apellidos_receptor_certificado: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      // Recipient second last name (optional)
      segundo_apellido_receptor_certificado: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      // Foreign key to tipo_documento — RESTRICT on delete
      id_tipodocumento_receptor_certificado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tipo_documento',
          key: 'id_tipo_documento',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },

      // Document number
      identificacion_receptor_certificado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },

      // Recipient address
      direccion_receptor_certificado: {
        type: Sequelize.STRING(120),
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
  // DOWN — Drop the 'receptor_certificado' table
  // ============================================================
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('receptor_certificado');
  },

};
