const { readAll, modify } = require('../utils/fileDb');
const { cleanString, httpError } = require('../utils/validators');

// GET /api/admin/stats  (admin only)
async function stats(req, res, next) {
  try {
    const [students, faculty, courses, drives, applications] = await Promise.all([
      readAll('students'),
      readAll('faculty'),
      readAll('courses'),
      readAll('placementDrives'),
      readAll('applications'),
    ]);

    const activeDrives = drives.filter((d) => d.status === 'active');

    const attendanceRecords = await readAll('attendance');
    const presentCount = attendanceRecords.filter((r) => r.status === 'Present').length;
    const totalAttendance = attendanceRecords.filter(
      (r) => r.status === 'Present' || r.status === 'Absent'
    ).length;
    const attendancePercentage = totalAttendance
      ? Math.round((presentCount / totalAttendance) * 100)
      : null;

    const selectedCount = applications.filter(
      (a) => a.status === 'selected' || a.status === 'hired'
    ).length;

    // Branch breakdown
    const branchMap = {};
    students.forEach((s) => {
      branchMap[s.branch] = (branchMap[s.branch] || 0) + 1;
    });

    // Recent applications (last 5)
    const recentApps = [...applications]
      .sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0))
      .slice(0, 5)
      .map((a) => {
        const drive = drives.find((d) => d.id === a.driveId) || {};
        const student = students.find((s) => s.id === a.studentId) || {};
        return {
          id: a.id,
          studentName: student.name || 'Unknown',
          company: drive.company || 'Unknown',
          role: drive.role || '',
          status: a.status || 'pending',
          appliedAt: a.appliedAt,
        };
      });

    res.json({
      students: students.length,
      faculty: faculty.length,
      courses: courses.length,
      activeDrives: activeDrives.length,
      totalDrives: drives.length,
      applications: applications.length,
      attendancePercentage,
      studentsSelected: selectedCount,
      branchBreakdown: branchMap,
      recentApplications: recentApps,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/settings
async function getSettings(req, res, next) {
  try {
    const settings = await readAll('settings', {
      attendanceThreshold: 75,
      gradingScheme: [],
    });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/settings
async function saveSettings(req, res, next) {
  try {
    const body = req.body || {};

    const threshold = Number(body.attendanceThreshold);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
      throw httpError(400, 'Attendance threshold must be between 0 and 100.');
    }

    const gradingScheme = Array.isArray(body.gradingScheme)
      ? body.gradingScheme.map((g) => ({
          grade: cleanString(g.grade, 5),
          minPercentage: Number(g.minPercentage),
          points: Number(g.points),
        })).filter((g) => g.grade && Number.isFinite(g.minPercentage) && Number.isFinite(g.points))
      : [];

    const collegeName = cleanString(body.collegeName || '', 200);
    const academicYear = cleanString(body.academicYear || '', 20);
    const maxSemester = Number(body.maxSemester) || 8;

    const settings = await modify('settings', (current) => {
      Object.assign(current, {
        attendanceThreshold: threshold,
        gradingScheme,
        collegeName,
        academicYear,
        maxSemester,
        updatedAt: new Date().toISOString(),
      });
      return current;
    }, {});

    res.json({ settings, message: 'Settings saved successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { stats, getSettings, saveSettings };
