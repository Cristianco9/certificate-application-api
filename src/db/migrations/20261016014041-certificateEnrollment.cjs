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

      // Foreign key to certificado. CASCADE: deleting the certificate
      // also removes every bridge row pointing at it.
      id_certificado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'certificado', key: 'id_certificado' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      // Foreign key to matricula.
      //
      // RESTRICT: an enrollment that has ever been certified cannot be
      // deleted — the certificates that reference it are legal documents
      // and must remain intact.
      //
      // IMPORTANT — this column is intentionally NOT unique on its own.
      //
      // An enrollment may be certified ANY number of times. Each issuance
      // is a distinct legal document with its own act number and issue
      // date. There is no "reprint" concept: if the recipient loses the
      // certificate, the secretary generates a fresh one with the same
      // content and a new act number. All content (student, enrollments,
      // recipient, institution, signers) is identical across issuances;
      // only the act number and the issue date differ.
      //
      // The only uniqueness enforced on the bridge is the composite
      // (id_certificado, id_matricula) pair created below — a single
      // certificate cannot link the same enrollment twice, but different
      // certificates may reference the same enrollment any number of
      // times.
      id_matricula: {
        type: Sequelize.INTEGER,
        allowNull: false,
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

    // Non-unique lookup index — `getByEnrollment` / `listByEnrollment`
    // scan the bridge by enrollment id.
    await queryInterface.addIndex('certificado_matricula', {
      fields: ['id_matricula'],
      name: 'certificado_matricula_id_matricula_idx',
    });

    // Composite UNIQUE — a single certificate cannot link the same
    // enrollment twice. Different certificates may reference the same
    // enrollment any number of times.
    await queryInterface.addIndex('certificado_matricula', {
      unique: true,
      fields: ['id_certificado', 'id_matricula'],
      name: 'uq_certificado_matricula',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('certificado_matricula');
  },
};
