const bcrypt = require('bcryptjs');
const { BRANCHES, ROLES } = require('../config/constants');
const { readAll, modify, newId } = require('../utils/fileDb');
const { findStudentByUserId, findFacultyByUserId } = require('../utils/lookups');
const {
  isValidEmail,
  cleanString,
  missingFields,
  isStrongPassword,
  httpError,
} = require('../utils/validators');

// Validates and cleans the student fields sent by the admin form.
function parseStudent(body) {
  const missing = missingFields(body, ['name', 'enrollmentNo', 'branch', 'semester', 'email']);
  if (missing.length) throw httpError(400, `Please fill in: ${missing.join(', ')}.`);

  const data = {
    name: cleanString(body.name),
    enrollmentNo: cleanString(body.enrollmentNo, 30).toUpperCase(),
    branch: cleanString(body.branch),
    semester: Number(body.semester),
    email: cleanString(body.email, 120).toLowerCase(),
    cgpa: body.cgpa === '' || body.cgpa === undefined ? 0 : Number(body.cgpa),
    academicPercentage:
      body.academicPercentage === '' || body.academicPercentage === undefined
        ? 0
        : Number(body.academicPercentage),
  };

  if (!isValidEmail(data.email)) throw httpError(400, 'Please enter a valid email address.');
  if (!BRANCHES.includes(data.branch)) throw httpError(400, 'Please choose a valid branch.');
  if (!Number.isInteger(data.semester) || data.semester < 1 || data.semester > 8) {
    throw httpError(400, 'Semester must be a whole number from 1 to 8.');
  }
  if (!/^[A-Z0-9-]{4,30}$/.test(data.enrollmentNo)) {
    throw httpError(400, 'Enrollment number can contain only letters, numbers and hyphens.');
  }
  if (Number.isNaN(data.cgpa) || data.cgpa < 0 || data.cgpa > 10) {
    throw httpError(400, 'CGPA must be a number from 0 to 10.');
  }
  if (Number.isNaN(data.academicPercentage) || data.academicPercentage < 0 || data.academicPercentage > 100) {
    throw httpError(400, 'Academic percentage must be a number from 0 to 100.');
  }
  return data;
}

// GET /api/students   (admin: all, faculty: only students in their courses)
async function list(req, res, next) {
  try {
    const students = await readAll('students');

    if (req.user.role === ROLES.ADMIN) {
      return res.json({ students });
    }

    const faculty = await findFacultyByUserId(req.user.id);
    if (!faculty) return res.json({ students: [] });

    const courses = await readAll('courses');
    const mine = courses.filter((c) => c.facultyId === faculty.id);
    const visible = students.filter((s) =>
      mine.some((c) => c.branch === s.branch && c.semester === s.semester)
    );
    res.json({ students: visible });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/me   (student's own profile)
async function getMe(req, res, next) {
  try {
    const student = await findStudentByUserId(req.user.id);
    if (!student) throw httpError(404, 'Student profile not found.');
    res.json({ student });
  } catch (err) {
    next(err);
  }
}

// POST /api/students   (admin)
async function create(req, res, next) {
  try {
    const data = parseStudent(req.body || {});
    const password = String((req.body || {}).password || '');
    if (!isStrongPassword(password)) {
      throw httpError(400, 'Password must be 8 to 72 characters and include a letter and a number.');
    }
    const passwordHash = await bcrypt.hash(password, 10);

    const student = await modify('users', async (users) => {
      if (users.some((u) => u.email === data.email)) {
        throw httpError(409, 'An account with this email already exists.');
      }
      const user = { id: newId('user'), email: data.email, passwordHash, role: ROLES.STUDENT, name: data.name };

      const created = await modify('students', (students) => {
        if (students.some((s) => s.enrollmentNo === data.enrollmentNo)) {
          throw httpError(409, 'This enrollment number is already registered.');
        }
        const record = { id: newId('stu'), userId: user.id, ...data };
        students.push(record);
        return record;
      });

      users.push(user); // only saved if the student was saved
      return created;
    });

    res.status(201).json({ student });
  } catch (err) {
    next(err);
  }
}

// PUT /api/students/:id   (admin)
async function update(req, res, next) {
  try {
    const data = parseStudent(req.body || {});
    const newPassword = (req.body || {}).password;
    let passwordHash = null;
    if (newPassword) {
      if (!isStrongPassword(String(newPassword))) {
        throw httpError(400, 'Password must be 8 to 72 characters and include a letter and a number.');
      }
      passwordHash = await bcrypt.hash(String(newPassword), 10);
    }

    const student = await modify('users', async (users) => {
      return modify('students', (students) => {
        const record = students.find((s) => s.id === req.params.id);
        if (!record) throw httpError(404, 'Student not found.');

        if (students.some((s) => s.id !== record.id && s.enrollmentNo === data.enrollmentNo)) {
          throw httpError(409, 'This enrollment number is already registered.');
        }
        const user = users.find((u) => u.id === record.userId);
        if (users.some((u) => u.id !== record.userId && u.email === data.email)) {
          throw httpError(409, 'An account with this email already exists.');
        }

        Object.assign(record, data);
        if (user) {
          user.email = data.email;
          user.name = data.name;
          if (passwordHash) user.passwordHash = passwordHash;
        }
        return record;
      });
    });

    res.json({ student });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/students/:id   (admin) - also removes the login and related records
async function remove(req, res, next) {
  try {
    const removed = await modify('users', async (users) => {
      return modify('students', (students) => {
        const index = students.findIndex((s) => s.id === req.params.id);
        if (index === -1) throw httpError(404, 'Student not found.');
        const [record] = students.splice(index, 1);
        const userIndex = users.findIndex((u) => u.id === record.userId);
        if (userIndex !== -1) users.splice(userIndex, 1);
        return record;
      });
    });

    // Clean up records that belonged to this student
    for (const file of ['attendance', 'marks', 'applications', 'resumes']) {
      await modify(file, (rows) => {
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i].studentId === removed.id) rows.splice(i, 1);
        }
      });
    }

    res.json({ message: 'Student deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getMe, create, update, remove };