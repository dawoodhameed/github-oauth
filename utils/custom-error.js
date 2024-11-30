class ApplicationError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR") {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.timestamp = new Date();

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  // Convert error to standardized JSON response
  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
      },
    };
  }
}

// Create specific error classes
class ValidationError extends ApplicationError {
  constructor(message, errors = []) {
    super(message, 400, "VALIDATION_ERROR");
    this.validationErrors = errors;
  }

  toJSON() {
    const baseJson = super.toJSON();
    baseJson.error.validationErrors = this.validationErrors;
    return baseJson;
  }
}

class AuthenticationError extends ApplicationError {
  constructor(message) {
    super(message, 401, "AUTHENTICATION_FAILED");
  }
}

class ResourceNotFoundError extends ApplicationError {
  constructor(resource) {
    super(`Resource not found: ${resource}`, 404, "RESOURCE_NOT_FOUND");
  }
}

module.exports = {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  ResourceNotFoundError,
};
