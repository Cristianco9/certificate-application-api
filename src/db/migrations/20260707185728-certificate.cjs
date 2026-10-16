'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  // ============================================================
  // UP — Create the 'certificado' table
  // ============================================================
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('certificado', {

      // Primary key
      id_certificado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
      },

      // Official record/act number
      numero_acta_certificado: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
      },

      // Issue date
      fecha_emision_certificado: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },

      // Foreign key to usuario (the staff member who issued the certificate) — RESTRICT on delete
      id_usuario_certificado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuario',
          key: 'id_usuario',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },

      // Foreign key to institucion — RESTRICT on delete
      id_institucion_certificado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'institucion',
          key: 'id_institucion',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },

      // Foreign key to receptor_certificado (optional) — SET NULL on delete
      id_receptor_certificado: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'receptor_certificado',
          key: 'id_receptor_certificado',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      // Certificate status
      estado_certificado: {
        type: Sequelize.ENUM('EMITIDO', 'ANULADO', 'REIMPRESO'),
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
  // DOWN — Drop the 'certificado' table
  // ============================================================
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('certificado');
  },

};
