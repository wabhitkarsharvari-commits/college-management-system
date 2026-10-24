const { BRANCHES, ROLES } = require('../config/constants');
const { readAll, modify, newId } = require('../utils/fileDb');
const { findStudentByUserId, findFacultyByUserId } = require('../utils/lookups');
const { cleanString, missingFields, httpError } = require('../utils/validators');

async function parseCourse(body) {
  const missing = missingFields(body, ['code', 'name', 'branch', 'semester', 'credits']);
  if (missing.length) throw httpError(400, `Please fill in: ${missing.join(', ')}.`);

  const data = {
    code: cleanString(body.code, 20).toUpperCase(),
    name: cleanString(body.name),
    branch: cleanString(body.branch),
    semester: Number(body.semester),
    credits: Number(body.credits),
    facultyId: cleanString(body.facultyId, 40),
  };

  if (!/^[A-Z0-9-]{2,20}$/.test(data.code)) {
    throw httpError(400, 'Course code can contain only letters, numbers and hyphens.');
  }
  if (!BRANCHES.includes(data.branch)) throw httpError(400, 'Please choose a valid branch.');
  if (!Number.isInteger(data.semester) || data.semester < 1 || data.semester > 8) {
    throw httpError(400, 'Semester must be a whole number from 1 to 8.');
  }
  if (!Number.isInteger(data.credits) || data.credits < 1 || data.credits > 10) {
    throw httpError(400, 'Credits must be a whole number from 1 to 10.');
  }
  if (data.facultyId) {
    const faculty = await readAll('faculty');
    if (!faculty.some((f) => f.id === data.facultyId)) {
      throw httpError(400, 'The selected faculty member does not exist.');
    }
  }
  return data;
}

// Adds the faculty name so the frontend can show it
async function withFacultyNames(courses) {
  const faculty = await readAll('faculty');
  return courses.map((c) => ({
    ...c,
    facultyName: faculty.find((f) => f.id === c.facultyId)?.name || '',
  }));
}

// GET /api/courses   (admin: all courses)
async function list(req, res, next) {
  try {
    res.json({ courses: await withFacultyNames(await readAll('courses')) });
  } catch (err) {
    next(err);
  }
}

// GET /api/courses/mine   (faculty: assigned courses, student: courses for their class)
async function mine(req, res, next) {
  try {
    const courses = await readAll('courses');
    let result = [];

    if (req.user.role === ROLES.FACULTY) {
      const faculty = await findFacultyByUserId(req.user.id);
      if (faculty) result = courses.filter((c) => c.facultyId === faculty.id);
    } else if (req.user.role === ROLES.STUDENT) {
      const student = await findStudentByUserId(req.user.id);
      if (student) {
        result = courses.filter((c) => c.branch === student.branch && c.semester === student.semester);
      }
    }

    res.json({ courses: await withFacultyNames(result) });
  } catch (err) {
    next(err);
  }
}

// POST /api/courses   (admin)
async function create(req, res, next) {
  try {
    const data = await parseCourse(req.body || {});
    const course = await modify('courses', (courses) => {
      if (courses.some((c) => c.code === data.code)) {
        throw httpError(409, 'A course with this code already exists.');
      }
      const record = { id: newId('crs'), ...data };
      courses.push(record);
      return record;
    });
    res.status(201).json({ course });
  } catch (err) {
    next(err);
  }
}

// PUT /api/courses/:id   (admin) - also used to assign or change the faculty
async function update(req, res, next) {
  try {
    const data = await parseCourse(req.body || {});
    const course = await modify('courses', (courses) => {
      const record = courses.find((c) => c.id === req.params.id);
      if (!record) throw httpError(404, 'Course not found.');
      if (courses.some((c) => c.id !== record.id && c.code === data.code)) {
        throw httpError(409, 'A course with this code already exists.');
      }
      Object.assign(record, data);
      return record;
    });
    res.json({ course });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/courses/:id   (admin) - blocked if attendance or marks exist
async function remove(req, res, next) {
  try {
    const attendance = await readAll('attendance');
    const marks = await readAll('marks');
    const id = req.params.id;
    if (attendance.some((a) => a.courseId === id) || marks.some((m) => m.courseId === id)) {
      throw httpError(409, 'This course has attendance or marks recorded and cannot be deleted.');
    }

    await modify('courses', (courses) => {
      const index = courses.findIndex((c) => c.id === id);
      if (index === -1) throw httpError(404, 'Course not found.');
      courses.splice(index, 1);
    });
    res.json({ message: 'Course deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, mine, create, update, remove };