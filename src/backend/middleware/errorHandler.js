/**
 * Global error handler middleware.
 * Catches all errors from route handlers and returns consistent JSON responses.
 */
function errorHandler(err, req, res, next) {
  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxMB = Math.round((parseInt(process.env.MAX_FILE_SIZE) || 5242880) / (1024 * 1024));
    return res.status(400).json({ error: `File too large. Maximum allowed size is ${maxMB}MB.` });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join('. ') });
  }

  // MongoDB duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue?.[field] || '';
    return res.status(409).json({
      error: `An account with this ${field} (${value}) already exists.`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  // Multer file type error
  if (err.message && err.message.includes('Only PDF')) {
    return res.status(400).json({ error: err.message });
  }

  // Generic server error
  console.error('[ERROR]', err.stack || err.message);
  return res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error. Please try again.',
  });
}

module.exports = { errorHandler };
