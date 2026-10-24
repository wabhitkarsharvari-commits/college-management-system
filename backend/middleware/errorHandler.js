// Runs when no route matches an /api URL.
function notFound(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// Catches any error thrown in the app and sends a clean JSON reply.
// Express recognises an error handler by its four parameters, so keep "next".
function errorHandler(err, req, res, next) {
  // Invalid JSON sent by the client
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body.' });
  }

  const status = err.status || 500;
  if (status === 500) {
    console.error(err); // full details stay in the server terminal only
  }

  res.status(status).json({
    message: status === 500 ? 'Something went wrong on the server.' : err.message,
  });
}

module.exports = { notFound, errorHandler };