// Import the sequelize instance from the database connection library
import { sequelize } from '../../libraries/DBConnection.js';
// Import DataTypes from sequelize to define column types
import { DataTypes } from 'sequelize';
// Define the name of the certificates table
export const CERTIFICATE_TABLE = 'certificado';
// Define the Certificate model
export const Certificate = sequelize.define(CERTIFICATE_TABLE, {
  // Define the 'id' column
  id: {
    // Integer type
    type: DataTypes.INTEGER,
    // This field cannot be null
    allowNull: false,
    // Primary key
    primaryKey: true,
    // Must be unique
    unique: true,
    // Auto increment value
    autoIncrement: true,
    // Database column name
    field: 'id_certificado',
  },
  // Official record/act number
  actNumber: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    field: 'numero_acta_certificado',
  },
  // Issue date
  issueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'fecha_emision_certificado',
  },
  // Foreign key to User (the staff member who issued the certificate)
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_usuario_certificado',
    references: {
      model: 'usuario',
      key: 'id_usuario',
    },
  },
  // Foreign key to Institution
  institutionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_institucion_certificado',
    references: {
      model: 'institucion',
      key: 'id_institucion',
    },
  },
  // Foreign key to Certificate Recipient
  recipientId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'id_receptor_certificado',
    references: {
      model: 'receptor_certificado',
      key: 'id_receptor_certificado',
    },
  },
  // Certificate status
  status: {
    type: DataTypes.ENUM('EMITIDO', 'ANULADO', 'REIMPRESO'),
    allowNull: false,
    field: 'estado_certificado',
  },
  // Creation date
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion',
  },
  // Last update date
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_modificacion',
  },
}, {
  // Pass the sequelize instance
  sequelize,
  // Specify the table name
  tableName: CERTIFICATE_TABLE,
  // Specify the model name
  modelName: 'certificate',
  // Enable automatic timestamps
  timestamps: true,
});
