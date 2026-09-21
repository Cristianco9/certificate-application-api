// Import the Boom library for HTTP-friendly error objects
import Boom from '@hapi/boom';

/**
 * Middleware for validating request data against a Joi schema.
 *
 * If validation fails, a Boom bad request error is forwarded to the
 * error-handling middlewares and the request pipeline STOPS there: the
 * controller is never reached with an invalid payload.
 *
 * @param {Object} schema - The Joi schema to validate against.
 * @param {string} property - The property of the request object
 * to validate (e.g., 'body', 'params', 'query').
 * @returns {Function} - A middleware function for validation.
 */
export const validatorHandler = (schema, property) => {
  // Return a middleware function
  return (req, res, next) => {
    // Extract the data from the specified property of the request object.
    // In Express 5, req.body is undefined when the request carries no body,
    // so fall back to an empty object to make Joi report the missing
    // required fields instead of letting the request through.
    const data = req[property] ?? {};

    // Validate the data against the provided schema with Joi
    const { error } = schema.validate(data, { abortEarly: false });

    // If there is a validation error, create a Boom bad request error and
    // forward it. The `return` is essential: without it, execution falls
    // through to the next() call below and the controller runs anyway.
    if (error) {
      return next(Boom.badRequest(error));
    }

    // If no error, proceed to the next middleware
    return next();
  };
};
