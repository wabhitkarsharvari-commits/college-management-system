const jwt = require('jsonwebtoken');
const { readAll } = require('../utils/fileDb');
const { httpError } = require('../utils/validators');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw httpError(401, 'Please log in to continue.');
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw httpError(401, 'Your session has expired. Please log in again.');
    }

    const users = await readAll('users');
    const user = users.find((u) => u.id === payload.id);
    if (!user) {
      throw httpError(401, 'Account no longer exists.');
    }

    // Only safe fields are attached to the request
    req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };