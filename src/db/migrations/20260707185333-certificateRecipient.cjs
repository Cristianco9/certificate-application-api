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

      // Recipient first surname
      apellidos_receptor_certificado: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      // Recipient second surname (optional)
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

      // Document number — UNIQUE. Two recipients cannot share a document
      // number; the same document number is the trigger for the
      // same-person check applied by CertificateRecipientServices.createOne.
      identificacion_receptor_certificado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },

      // Relationship to the student at delivery time.
      //
      // One of: 'Padre', 'Madre', 'Hermano(a)', 'Tío(a)', 'Abuelo(a)',
      // 'Primo(a)', 'Cónyuge', 'Acudiente', 'Otro'.
      //
      // Treated as a CRITICAL identification field: when a recipient
      // returns months or years later to request a new certificate, the
      // service compares this value — along with firstName, lastName,
      // documentTypeId and documentNumber — to confirm the record
      // belongs to the same person before refreshing their address.
      //
      // Nullable on purpose: existing rows created before the column
      // existed get NULL rather than a fabricated default. The service
      // treats NULL as a wildcard and backfills the value on the next
      // re-registration.
      relacion_receptor_certificado: {
        type: Sequelize.ENUM(
          'Padre',
          'Madre',
          'Hermano(a)',
          'Tío(a)',
          'Abuelo(a)',
          'Primo(a)',
          'Cónyuge',
          'Acudiente',
          'Otro'
        ),
        allowNull: true,
      },

      // Recipient address. Overwritten in place when the same person
      // returns with a different address — the point of the
      // same-person check is that only contact information moves.
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
