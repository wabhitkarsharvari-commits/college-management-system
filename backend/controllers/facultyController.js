const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');
const { readAll, modify, newId } = require('../utils/fileDb');
const {
  isValidEmail,
  cleanString,
  missingFields,
  isStrongPassword,
  httpError,
} = require('../utils/validators');

function parseFaculty(body) {
  const missing = missingFields(body, ['name', 'email', 'department']);
  if (missing.length) throw httpError(400, `Please fill in: ${missing.join(', ')}.`);

  const data = {
    name: cleanString(body.name),
    email: cleanString(body.email, 120).toLowerCase(),
    department: cleanString(body.department),
  };
  if (!isValidEmail(data.email)) throw httpError(400, 'Please enter a valid email address.');
  return data;
}

// GET /api/faculty   (admin)
async function list(req, res, next) {
  try {
    res.json({ faculty: await readAll('faculty') });
  } catch (err) {
    next(err);
  }
}

// POST /api/faculty   (admin)
async function create(req, res, next) {
  try {
    const data = parseFaculty(req.body || {});
    const password = String((req.body || {}).password || '');
    if (!isStrongPassword(password)) {
      throw httpError(400, 'Password must be 8 to 72 characters and include a letter and a number.');
    }
    const passwordHash = await bcrypt.hash(password, 10);

    const faculty = await modify('users', async (users) => {
      if (users.some((u) => u.email === data.email)) {
        throw httpError(409, 'An account with this email already exists.');
      }
      const user = { id: newId('user'), email: data.email, passwordHash, role: ROLES.FACULTY, name: data.name };
      const record = await modify('faculty', (list) => {
        const item = { id: newId('fac'), userId: user.id, ...data };
        list.push(item);
        return item;
      });
      users.push(user);
      return record;
    });

    res.status(201).json({ faculty });
  } catch (err) {
    next(err);
  }
}

// PUT /api/faculty/:id   (admin)
async function update(req, res, next) {
  try {
    const data = parseFaculty(req.body || {});
    const newPassword = (req.body || {}).password;
    let passwordHash = null;
    if (newPassword) {
      if (!isStrongPassword(String(newPassword))) {
        throw httpError(400, 'Password must be 8 to 72 characters and include a letter and a number.');
      }
      passwordHash = await bcrypt.hash(String(newPassword), 10);
    }

    const faculty = await modify('users', async (users) => {
      return modify('faculty', (list) => {
        const record = list.find((f) => f.id === req.params.id);
        if (!record) throw httpError(404, 'Faculty member not found.');
        if (users.some((u) => u.id !== record.userId && u.email === data.email)) {
          throw httpError(409, 'An account with this email already exists.');
        }
        Object.assign(record, data);
        const user = users.find((u) => u.id === record.userId);
        if (user) {
          user.email = data.email;
          user.name = data.name;
          if (passwordHash) user.passwordHash = passwordHash;
        }
        return record;
      });
    });

    res.json({ faculty });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/faculty/:id   (admin) - their courses become unassigned
async function remove(req, res, next) {
  try {
    const removed = await modify('users', async (users) => {
      return modify('faculty', (list) => {
        const index = list.findIndex((f) => f.id === req.params.id);
        if (index === -1) throw httpError(404, 'Faculty member not found.');
        const [record] = list.splice(index, 1);
        const userIndex = users.findIndex((u) => u.id === record.userId);
        if (userIndex !== -1) users.splice(userIndex, 1);
        return record;
      });
    });

    await modify('courses', (courses) => {
      courses.forEach((c) => {
        if (c.facultyId === removed.id) c.facultyId = '';
      });
    });

    res.json({ message: 'Faculty member deleted. Their courses are now unassigned.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };