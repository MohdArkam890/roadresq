/**
 * EXPERIMENT 5 — centralized, consistent error handling
 * ----------------------------------------------------------
 * Every controller throws or next()s an AppError instead of shaping
 * its own error response. One handler formats every error the same
 * way: { success: false, error: "..." }.
 *
 * Known library errors (bad ObjectId, schema validation, duplicate
 * key, malformed JSON) are translated into the right 4xx instead of
 * leaking out as a generic 500.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// map third-party errors onto AppErrors so they get a meaningful status
function normalize(err) {
  if (err.isOperational) return err;

  if (err.name === "CastError") {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }
  if (err.name === "ValidationError" && err.errors) {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join("; ");
    return new AppError(message, 422);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return new AppError(`Duplicate value for ${field}`, 409);
  }
  if (err.type === "entity.parse.failed") {
    return new AppError("Malformed JSON body", 400);
  }
  if (err.type === "entity.too.large") {
    return new AppError("Request body too large", 413);
  }
  return err;
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const error = normalize(err);
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500 && process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  const response = {
    success: false,
    error: error.isOperational ? error.message : "Something went wrong",
  };
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }
  res.status(statusCode).json(response);
}

module.exports = { AppError, notFound, errorHandler, normalize };
