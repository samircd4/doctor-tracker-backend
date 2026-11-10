/**
 * middleware/errorHandler.js
 * Last middleware in the chain: turns any thrown error into a clean JSON response.
 * Express 5 forwards errors from async handlers here automatically.
 */
import mongoose from "mongoose";

// 404 for unknown /api routes
export function notFound(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Invalid MongoDB ObjectId in the URL, e.g. /api/doctors/abc
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { message: `Invalid ${err.path}` } });
  }

  // Duplicate value on a unique index (e.g. doctor email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      error: { message: `${field} already exists`, details: [{ field, message: `${field} already exists` }] },
    });
  }

  // Mongoose schema validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({ error: { message: "Validation failed", details } });
  }

  // Anything else is unexpected: log it, but don't leak internals to the client
  console.error(err);
  res.status(err.status || 500).json({ error: { message: err.expose ? err.message : "Something went wrong" } });
}
