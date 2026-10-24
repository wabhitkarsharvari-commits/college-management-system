
const { readAll, modify } = require('../utils/fileDb');
const { findFacultyByUserId } = require('../utils/lookups');
const { httpError } = require('../utils/validators');

async function getContext(req, courseId) {
  const faculty = await findFacultyByUserId(req.user.id);
  if (!faculty) throw httpError(403, 'Faculty profile not found.');

  const courses = await readAll('courses');
  const course = courses.find(
    (c) => c.id === courseId && c.facultyId === faculty.id
  );
  if (!course) throw httpError(403, 'This course is not assigned to you.');

  const allStudents = await readAll('students');
  const students = allStudents.filter(
    (s) => s.branch === course.branch && s.semester === course.semester
  );

  return { course, students };
}

// GET /api/attendance/course/:courseId
async function list(req, res, next) {
  try {
    const { students } = await getContext(req, req.params.courseId);
    const records = await readAll('attendance');

    res.json({
      attendance: students.map((student) => {
        const record = records.find(
          (a) =>
            a.courseId === req.params.courseId &&
            a.studentId === student.id &&
            a.date === (req.query.date || new Date().toISOString().slice(0, 10))
        );

        return {
  studentId: student.id,
  name: student.name,
  enrollmentNo: student.enrollmentNo,
  branch: student.branch,
  semester: student.semester,
  status: record?.status || 'Not recorded',
  date: record?.date || req.query.date || new Date().toISOString().slice(0, 10),
};
      }),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/attendance
// Body: { courseId, date, records: [{ studentId, status }] }
async function save(req, res, next) {
  try {
    const { courseId, date, records } = req.body || {};
    if (!courseId || !date || !Array.isArray(records) || records.length === 0) {
      throw httpError(400, 'Course, date and attendance records are required.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw httpError(400, 'Date must use YYYY-MM-DD format.');
    }

    const { students } = await getContext(req, courseId);
    const allowedIds = new Set(students.map((s) => s.id));
    const seen = new Set();

    for (const item of records) {
      if (!allowedIds.has(item.studentId)) {
        throw httpError(400, 'A student does not belong to this course.');
      }
      if (!['Present', 'Absent'].includes(item.status)) {
        throw httpError(400, 'Status must be Present or Absent.');
      }
      if (seen.has(item.studentId)) {
        throw httpError(400, 'Duplicate student in attendance records.');
      }
      seen.add(item.studentId);
    }

    const saved = await modify('attendance', (all) => {
      const result = [];

      for (const item of records) {
        let record = all.find(
          (a) =>
            a.courseId === courseId &&
            a.studentId === item.studentId &&
            a.date === date
        );

        if (record) {
          record.status = item.status;
          record.updatedAt = new Date().toISOString();
        } else {
          record = {
            courseId,
            studentId: item.studentId,
            date,
            status: item.status,
            updatedAt: new Date().toISOString(),
          };
          all.push(record);
        }

        result.push(record);
      }

      return result;
    });

    res.json({ message: 'Attendance saved successfully.', attendance: saved });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, save };
