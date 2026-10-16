import { sequelize } from '../../libraries/DBConnection.js';
import { DataTypes } from 'sequelize';

export const CERTIFICATE_ENROLLMENT_TABLE = 'certificado_matricula';

export const CertificateEnrollment = sequelize.define(CERTIFICATE_ENROLLMENT_TABLE, {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    unique: true,
    autoIncrement: true,
    field: 'id_certificado_matricula',
  },
  certificateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_certificado',
    references: { model: 'certificado', key: 'id_certificado' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  enrollmentId: {
    // NOT unique on its own.
    //
    // An enrollment may be certified any number of times. Each issuance
    // is a distinct legal document with its own act number and issue
    // date — the certificate is never "reprinted", only re-generated
    // when the original is lost. All content is identical across
    // issuances; only the act number and the issue date differ.
    //
    // The only uniqueness enforced on this bridge is the composite
    // (certificateId, enrollmentId) pair declared in the indexes below.
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_matricula',
    references: { model: 'matricula', key: 'id_matricula' },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_modificacion',
  },
}, {
  sequelize,
  tableName: CERTIFICATE_ENROLLMENT_TABLE,
  modelName: 'certificateEnrollment',
  timestamps: true,
  indexes: [
    // Same enrollment cannot appear twice on the SAME certificate.
    {
      unique: true,
      fields: ['id_certificado', 'id_matricula'],
      name: 'uq_certificado_matricula',
    },
    // Non-unique lookup index for "all certificates of an enrollment".
    {
      fields: ['id_matricula'],
      name: 'certificado_matricula_id_matricula_idx',
    },
  ],
});
