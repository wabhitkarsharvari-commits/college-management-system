const ROLES = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
  STUDENT: 'student',
};

// Used when settings.json is created. The admin can edit these later.
const DEFAULT_SETTINGS = {
  attendanceThreshold: 75,
  // A student gets the first grade whose minPercentage they reach.
  gradingScheme: [
    { grade: 'O', minPercentage: 90, points: 10 },
    { grade: 'A+', minPercentage: 80, points: 9 },
    { grade: 'A', minPercentage: 70, points: 8 },
    { grade: 'B+', minPercentage: 60, points: 7 },
    { grade: 'B', minPercentage: 50, points: 6 },
    { grade: 'C', minPercentage: 40, points: 5 },
    { grade: 'F', minPercentage: 0, points: 0 },
  ],
};

const BRANCHES = ['Information Technology', 'Computer Science', 'Electronics', 'Mechanical', 'Civil'];

module.exports = { ROLES, DEFAULT_SETTINGS, BRANCHES };