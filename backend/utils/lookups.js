const { readAll } = require('./fileDb');

async function findStudentByUserId(userId) {
  const students = await readAll('students');
  return students.find((s) => s.userId === userId) || null;
}

async function findFacultyByUserId(userId) {
  const faculty = await readAll('faculty');
  return faculty.find((f) => f.userId === userId) || null;
}

module.exports = { findStudentByUserId, findFacultyByUserId };