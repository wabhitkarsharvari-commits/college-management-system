const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ROLES, BRANCHES } = require('../config/constants');
const { readAll, modify, newId } = require('../utils/fileDb');
const {
  isValidEmail,
  cleanString,
  missingFields,
  isStrongPassword,
  httpError,
} = require('../utils/validators');

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/register  (students only)
async function register(req, res, next) {
  try {
    const body = req.body || {};
    const missing = missingFields(body, ['name', 'enrollmentNo', 'branch', 'semester', 'email', 'password']);
    if (missing.length) {
      throw httpError(400, `Please fill in: ${missing.join(', ')}.`);
    }

    const name = cleanString(body.name);
    const enrollmentNo = cleanString(body.enrollmentNo, 30).toUpperCase();
    const branch = cleanString(body.branch);
    const semester = Number(body.semester);
    const email = cleanString(body.email, 120).toLowerCase();
    const password = String(body.password);

    if (!isValidEmail(email)) throw httpError(400, 'Please enter a valid email address.');
    if (!BRANCHES.includes(branch)) throw httpError(400, 'Please choose a valid branch.');
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
      throw httpError(400, 'Semester must be a whole number from 1 to 8.');
    }
    if (!/^[A-Z0-9-]{4,30}$/.test(enrollmentNo)) {
      throw httpError(400, 'Enrollment number can contain only letters, numbers and hyphens.');
    }
    if (!isStrongPassword(password)) {
      throw httpError(400, 'Password must be 8 to 72 characters and include a letter and a number.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Everything below runs one-at-a-time so duplicate checks are reliable.
    const user = await modify('users', async (users) => {
      if (users.some((u) => u.email === email)) {
        throw httpError(409, 'An account with this email already exists.');
      }

      const students = await readAll('students');
      if (students.some((s) => s.enrollmentNo === enrollmentNo)) {
        throw httpError(409, 'This enrollment number is already registered.');
      }

      const newUser = { id: newId('user'), email, passwordHash, role: ROLES.STUDENT, name };
      users.push(newUser);

      await modify('students', (list) => {
        list.push({
          id: newId('stu'),
          userId: newUser.id,
          name,
          enrollmentNo,
          branch,
          semester,
          email,
          cgpa: 0,
          academicPercentage: 0,
        });
      });

      return newUser;
    });

    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const email = cleanString((req.body || {}).email, 120).toLowerCase();
    const password = String((req.body || {}).password || '');

    if (!email || !password) {
      throw httpError(400, 'Please enter your email and password.');
    }

    const users = await readAll('users');
    const user = users.find((u) => u.email === email);

    // Same message for "no such user" and "wrong password"
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) {
      throw httpError(401, 'Incorrect email or password.');
    }

    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };