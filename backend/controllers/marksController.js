
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

  const students = (await readAll('students')).filter(
    (s) => s.branch === course.branch && s.semester === course.semester
  );

  return { course, students };
}

async function list(req, res, next) {
  try {
    const { students } = await getContext(req, req.params.courseId);
    const marks = await readAll('marks');

    res.json({
      marks: students.map((student) => {
        const record = marks.find(
          (m) => m.courseId === req.params.courseId && m.studentId === student.id
        );

        return {
          studentId: student.id,
          name: student.name,
          enrollmentNo: student.enrollmentNo,
          marks: record?.marks ?? '',
          maxMarks: record?.maxMarks ?? 100,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function save(req, res, next) {
  try {
    const { courseId, records } = req.body || {};

    if (!courseId || !Array.isArray(records) || records.length === 0) {
      throw httpError(400, 'Course and marks records are required.');
    }

    const { students } = await getContext(req, courseId);
    const allowedIds = new Set(students.map((s) => s.id));
    const seen = new Set();

    for (const item of records) {
      const marks = Number(item.marks);
      const maxMarks = Number(item.maxMarks ?? 100);

      if (!allowedIds.has(item.studentId)) {
        throw httpError(400, 'A student does not belong to this course.');
      }
      if (!Number.isFinite(marks) || !Number.isFinite(maxMarks) ||
          maxMarks <= 0 || marks < 0 || marks > maxMarks) {
        throw httpError(400, 'Marks must be between 0 and the maximum marks.');
      }
      if (seen.has(item.studentId)) {
        throw httpError(400, 'Duplicate student in marks records.');
      }
      seen.add(item.studentId);
    }

    const saved = await modify('marks', (all) => {
      const result = [];

      for (const item of records) {
        const marks = Number(item.marks);
        const maxMarks = Number(item.maxMarks ?? 100);

        let record = all.find(
          (m) => m.courseId === courseId && m.studentId === item.studentId
        );

        if (record) {
          record.marks = marks;
          record.maxMarks = maxMarks;
          record.updatedAt = new Date().toISOString();
        } else {
          record = {
            courseId,
            studentId: item.studentId,
            marks,
            maxMarks,
            updatedAt: new Date().toISOString(),
          };
          all.push(record);
        }

        result.push(record);
      }

      return result;
    });

    res.json({ message: 'Marks saved successfully.', marks: saved });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, save };
