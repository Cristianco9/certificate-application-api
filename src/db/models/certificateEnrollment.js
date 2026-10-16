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
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
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
});
