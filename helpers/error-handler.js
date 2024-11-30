const logger = require("../config/logger");
const { ApplicationError } = require("../utils/custom-error");

// Central error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log the full error for server-side tracking
  logger.error("Unhandled Error", {
    message: err.message,
    stack: err.stack,
    originalUrl: req.originalUrl,
    method: req.method,
  });

  // Check if error is an instance of our custom ApplicationError
  if (err instanceof ApplicationError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle unexpected errors
  const standardError = new ApplicationError(
    err.message || "An unexpected error occurred",
    500,
    "UNEXPECTED_ERROR"
  );

  res.status(500).json(standardError.toJSON());
};

// Middleware to handle 404 routes
const notFoundHandler = (req, res, next) => {
  const err = new ApplicationError(
    `Route Not Found: ${req.originalUrl}`,
    404,
    "ROUTE_NOT_FOUND"
  );
  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
