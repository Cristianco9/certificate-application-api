// Import the sequelize instance from the database connection library
import { sequelize } from '../../libraries/DBConnection.js';
// Import DataTypes from sequelize to define column types
import { DataTypes } from 'sequelize';
// Define the name of the institutions table
export const INSTITUTION_TABLE = 'institucion';
// Define the Institution model
export const Institution = sequelize.define(INSTITUTION_TABLE, {
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
    field: 'id_institucion',
  },
  // Institution name
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'nombre_institucion',
  },
  // Institutional code (assigned by the Ministry of Education)
  institutionalCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'codigo_institucional',
  },
  // Institution address
  address: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'direccion_institucion',
  },
  // Foreign key to Municipality
  municipalityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'id_municipio_institucion',
    references: {
      model: 'municipio',
      key: 'id_municipio',
    },
  },
  // Institution email
  email: {
    type: DataTypes.STRING(254),
    allowNull: false,
    field: 'email_institucion',
    validate: {
      isEmail: true,
    },
  },
  // Tax identification number (NIT)
  nitId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'nit_institucion',
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
  tableName: INSTITUTION_TABLE,
  // Specify the model name
  modelName: 'institution',
  // Enable automatic timestamps
  timestamps: true,
});
