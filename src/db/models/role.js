// Import the sequelize instance from the database connection library
import { sequelize } from '../../libraries/DBConnection.js';
// Import DataTypes from sequelize to define column types
import { DataTypes } from 'sequelize';
// Define the name of the roles table
export const ROLE_TABLE = 'rol';
// Define the Role model
export const Role = sequelize.define(ROLE_TABLE, {
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
    field: 'id_rol',
  },
  // Role name (e.g. 'Máster', 'Auxiliar', 'Administrador', 'Secretario', 'Rector')
  name: {
    type: DataTypes.ENUM('Máster', 'Auxiliar', 'Administrador', 'Secretario', 'Rector'),
    allowNull: false,
    unique: true,
    field: 'nombre_rol',
  },
  // Role description
  description: {
    type: DataTypes.STRING(70),
    allowNull: false,
    field: 'descripcion_rol',
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
  tableName: ROLE_TABLE,
  // Specify the model name
  modelName: 'role',
  // Enable automatic timestamps
  timestamps: true,
});
