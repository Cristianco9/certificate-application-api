// Import necessary modules and dependencies
// Express framework for creating the api
import express from 'express';
// function to manage files and directories since the node.js api
import path from 'path';
// function to have access to the directory or file path
import { fileURLToPath } from 'url';
// Middleware to handle body request
import bodyParser from 'body-parser';
// Middleware to handle cookies
import cookieParser from 'cookie-parser';
// Middleware for logging HTTP requests
import morgan from 'morgan';
// Function to test database connection
import { testConnection } from './libraries/DBConnection.js';
// Import the IP address and port from the network configuration file
import { theIPAddress, port } from './libraries/netConfig.js';
// Main router for the API
import routerApi from './routes/index.js';
// Custom error handling middlewares
import {
    logError,
    errorHandler,
    boomErrorHandler,
    ORMErrorHandler
} from "./middlewares/errorHandler.js";
// Import the setup of the database entities associations
import { setupAssociations } from './db/models/index.js';

// Create the api with Express
const api = express();

// Use middlewares
// HTTP request logger middleware
api.use(morgan('dev'));
// Middleware to parse URL-encoded data
api.use(express.urlencoded({ extended: false }));
// Middleware to parse JSON data
api.use(express.json());
// Middleware for parsing JSON bodies
api.use(bodyParser.json());
// Middleware for handle cookies
api.use(cookieParser());

// Static files path
// Store in the constant the project dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Immediately Invoked Function Expression (IIFE) to run the server
(async () => {
  // Await the api to start listening on the specified IP address and port
  const createapi = await api.listen(port, theIPAddress, (req, res) => {
    // Log the server start information to the console
    console.log(`server on port http://${theIPAddress}:${port}`);
  });
})();
// Set up all Sequelize model associations before any database query is made
// This is a memory-only operation and does not require an active DB connection
setupAssociations();

// Test database connection
// Call the function to ensure the database connection is working
testConnection();

// Initialize the main router
// Set up API routes
routerApi(api);

// Import passport authentication setup
// Dynamic import of authentication module
const passport = import('./utils/auth/index.js');

// Use custom error handling middlewares
// Middleware for logging errors
api.use(logError);
// Middleware for handling ORM errors
api.use(ORMErrorHandler);
// Middleware for handling Boom errors
api.use(boomErrorHandler);
// General error handling middleware
api.use(errorHandler);

// Export the api for use in other files
export default api;
