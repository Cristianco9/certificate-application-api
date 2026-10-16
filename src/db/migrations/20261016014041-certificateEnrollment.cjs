'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('certificado_matricula', {
      id_certificado_matricula: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
      },

      // enrollment links
      id_certificado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'certificado', key: 'id_certificado' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      // certificate. RESTRICT: an enrollment with a certificate cannot be
      // deleted.
      id_matricula: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'matricula', key: 'id_matricula' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },

      fecha_creacion: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      fecha_modificacion: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('certificado_matricula');
  },
};
