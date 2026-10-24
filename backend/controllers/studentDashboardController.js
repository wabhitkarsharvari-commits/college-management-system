const { readAll, modify } = require('../utils/fileDb');
const { findStudentByUserId } = require('../utils/lookups');
const { httpError } = require('../utils/validators');

async function getStudent(req) {
  const student = await findStudentByUserId(req.user.id);

  if (!student) {
    throw httpError(404, 'Student profile not found.');
  }

  return student;
}

async function attendance(req, res, next) {
  try {
    const student = await getStudent(req);

    const [records, courses] = await Promise.all([
      readAll('attendance'),
      readAll('courses'),
    ]);

    const ownRecords = records
      .filter((record) => record.studentId === student.id)
      .map((record) => ({
        ...record,
        courseName:
          courses.find((course) => course.id === record.courseId)?.name ||
          'Unknown course',
      }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const present = ownRecords.filter(
      (record) => record.status === 'Present'
    ).length;

    const absent = ownRecords.filter(
      (record) => record.status === 'Absent'
    ).length;

    const total = present + absent;

    res.json({
      attendance: ownRecords,
      summary: {
        present,
        absent,
        total,
        percentage: total ? Math.round((present / total) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function marks(req, res, next) {
  try {
    const student = await getStudent(req);

    const [records, courses] = await Promise.all([
      readAll('marks'),
      readAll('courses'),
    ]);

    const ownMarks = records
      .filter((record) => record.studentId === student.id)
      .map((record) => ({
        ...record,
        courseName:
          courses.find((course) => course.id === record.courseId)?.name ||
          'Unknown course',
        percentage:
          Number(record.maxMarks) > 0
            ? Math.round(
                (Number(record.marks) / Number(record.maxMarks)) * 100
              )
            : 0,
      }));

    res.json({ marks: ownMarks });
  } catch (err) {
    next(err);
  }
}

async function placements(req, res, next) {
  try {
    const drives = await readAll('placementDrives');

    res.json({
      drives: drives.filter((drive) => drive.status === 'active'),
    });
  } catch (err) {
    next(err);
  }
}

async function applications(req, res, next) {
  try {
    const student = await getStudent(req);
    const records = await readAll('applications');

    res.json({
      applications: records.filter(
        (application) => application.studentId === student.id
      ),
    });
  } catch (err) {
    next(err);
  }
}

async function apply(req, res, next) {
  try {
    const student = await getStudent(req);
    const { driveId } = req.body || {};

    if (!driveId) {
      throw httpError(400, 'driveId is required.');
    }

    const drives = await readAll('placementDrives');
    const drive = drives.find((d) => d.id === driveId);
    if (!drive) throw httpError(404, 'Placement drive not found.');
    if (drive.status !== 'active') throw httpError(400, 'This drive is no longer active.');

    const application = await modify('applications', (apps) => {
      if (apps.some((a) => a.studentId === student.id && a.driveId === driveId)) {
        throw httpError(409, 'You have already applied to this drive.');
      }
      const record = {
        id: `app-${Date.now()}`,
        studentId: student.id,
        driveId,
        status: 'pending',
        appliedAt: new Date().toISOString(),
      };
      apps.push(record);
      return record;
    });

    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  attendance,
  marks,
  placements,
  applications,
  apply,
};
