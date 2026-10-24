const { httpError } = require('../utils/validators');

// Usage: requireRole('admin') or requireRole('admin', 'faculty')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(httpError(403, 'You do not have permission to do this.'));
    }
    next();
  };
}

module.exports = { requireRole };