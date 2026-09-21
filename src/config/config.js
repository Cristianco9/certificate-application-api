// Import dotenv package to load environment variables from a .env file
import dotenv from "dotenv";

// Load environment variables from .env file into process.env
dotenv.config();

// Export the configuration object containing various application settings
export const config = {
  // Set the environment (default to 'dev' if not specified)
  env: process.env.NODE_ENV || 'dev',
  // Database dialect (default to 'mysql' if not specified)
  dialect: process.env.DIALECT || 'mysql',
  // Application port
  appPort: process.env.APP_PORT,
  // Database user name from environment variables (single app user, not root)
  dbUser: process.env.DB_USER,
  // Database user password from environment variables
  dbPassword: process.env.DB_PASSWORD,
  // Database host from environment variables
  dbHost: process.env.DB_HOST,
  // Database name from environment variables
  dbName: process.env.DB_NAME,
  // Database port from environment variables
  dbPort: process.env.DB_PORT,
  // API key from environment variables
  APIKey: process.env.API_KEY,
  // JWT secret key for the authentication application
  authAppJwtKey: process.env.AUTH_APP_JWT_SECRET_KEY,
  // Allowed frontend origin for CORS requests
  corsOrigin: process.env.CORS_ORIGIN
};
