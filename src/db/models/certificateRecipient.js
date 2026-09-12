// Import the sequelize instance from the database connection library
import { sequelize } from '../../libraries/DBConnection.js';
// Import DataTypes from sequelize to define column types
import { DataTypes } from 'sequelize';
// Define the name of the certificate recipients table
export const CERTIFICATE_RECIPIENT_TABLE = 'receptor_certificado';
// Define the CertificateRecipient model
export const CertificateRecipient = sequelize.define(CERTIFICATE_RECIPIENT_TABLE, {
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
    field: 'id_receptor_certificado',
  },
  // Recipient first name
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'nombre_receptor_certificado',
  },
  // Recipient middle name (optional)
  middleName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'segundo_nombre_receptor_certificado',
  },
  // Recipient last name
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'apellidos_receptor_certificado',
  },
  // Recipient second last name (optional)
  secondLastName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'segundo_apellido_receptor_certificado',
  },
  // Foreign key to Document Type
  documentTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_tipodocumento_receptor_certificado',
    references: {
      model: 'tipo_documento',
      key: 'id_tipo_documento',
    },
  },
  // Document number
  documentNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'identificacion_receptor_certificado',
  },
  // Recipient address
  address: {
    type: DataTypes.STRING(120),
    allowNull: false,
    field: 'direccion_receptor_certificado',
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
  tableName: CERTIFICATE_RECIPIENT_TABLE,
  // Specify the model name
  modelName: 'certificateRecipient',
  // Enable automatic timestamps
  timestamps: true,
});
