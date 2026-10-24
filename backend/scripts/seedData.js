const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { ROLES, DEFAULT_SETTINGS } = require('../config/constants');

// ---------------------------------------------------------------
// DEMO DATA ONLY. These accounts and records are fake and exist
// only so you can demonstrate the application.
// Running this script OVERWRITES the existing data files.
// ---------------------------------------------------------------

const DATA_DIR = path.join(__dirname, '..', 'data');
const hash = (password) => bcrypt.hashSync(password, 10);

const users = [
  { id: 'admin-1', email: 'admin@demo.college.edu', passwordHash: hash('Admin@123'), role: ROLES.ADMIN, name: 'Demo Admin' },
  { id: 'user-fac-1', email: 'meera.rao@demo.college.edu', passwordHash: hash('Faculty@123'), role: ROLES.FACULTY, name: 'Dr. Meera Rao' },
  { id: 'user-fac-2', email: 'arjun.patil@demo.college.edu', passwordHash: hash('Faculty@123'), role: ROLES.FACULTY, name: 'Prof. Arjun Patil' },
  { id: 'user-stu-1', email: 'riya.sharma@demo.college.edu', passwordHash: hash('Student@123'), role: ROLES.STUDENT, name: 'Riya Sharma' },
  { id: 'user-stu-2', email: 'aman.verma@demo.college.edu', passwordHash: hash('Student@123'), role: ROLES.STUDENT, name: 'Aman Verma' },
  { id: 'user-stu-3', email: 'sneha.joshi@demo.college.edu', passwordHash: hash('Student@123'), role: ROLES.STUDENT, name: 'Sneha Joshi' },
  { id: 'user-stu-4', email: 'rohan.deshmukh@demo.college.edu', passwordHash: hash('Student@123'), role: ROLES.STUDENT, name: 'Rohan Deshmukh' },
  { id: 'user-stu-5', email: 'priya.nair@demo.college.edu', passwordHash: hash('Student@123'), role: ROLES.STUDENT, name: 'Priya Nair' },
];

const faculty = [
  { id: 'fac-1', userId: 'user-fac-1', name: 'Dr. Meera Rao', email: 'meera.rao@demo.college.edu', department: 'Information Technology' },
  { id: 'fac-2', userId: 'user-fac-2', name: 'Prof. Arjun Patil', email: 'arjun.patil@demo.college.edu', department: 'Computer Science' },
];

const students = [
  { id: 'stu-1', userId: 'user-stu-1', name: 'Riya Sharma', enrollmentNo: 'IT2022001', branch: 'Information Technology', semester: 5, email: 'riya.sharma@demo.college.edu', cgpa: 8.6, academicPercentage: 82 },
  { id: 'stu-2', userId: 'user-stu-2', name: 'Aman Verma', enrollmentNo: 'IT2022002', branch: 'Information Technology', semester: 5, email: 'aman.verma@demo.college.edu', cgpa: 7.1, academicPercentage: 68 },
  { id: 'stu-3', userId: 'user-stu-3', name: 'Sneha Joshi', enrollmentNo: 'CS2022001', branch: 'Computer Science', semester: 5, email: 'sneha.joshi@demo.college.edu', cgpa: 9.2, academicPercentage: 89 },
  { id: 'stu-4', userId: 'user-stu-4', name: 'Rohan Deshmukh', enrollmentNo: 'CS2022002', branch: 'Computer Science', semester: 5, email: 'rohan.deshmukh@demo.college.edu', cgpa: 6.4, academicPercentage: 58 },
  { id: 'stu-5', userId: 'user-stu-5', name: 'Priya Nair', enrollmentNo: 'IT2022003', branch: 'Information Technology', semester: 5, email: 'priya.nair@demo.college.edu', cgpa: 7.9, academicPercentage: 75 },
];

// DEMO courses (assigned to the demo faculty)
const courses = [
  { id: 'crs-1', code: 'IT501', name: 'Database Management Systems', branch: 'Information Technology', semester: 5, credits: 4, facultyId: 'fac-1' },
  { id: 'crs-2', code: 'IT502', name: 'Computer Networks', branch: 'Information Technology', semester: 5, credits: 4, facultyId: 'fac-1' },
  { id: 'crs-3', code: 'IT503', name: 'Web Technologies', branch: 'Information Technology', semester: 5, credits: 3, facultyId: 'fac-2' },
  { id: 'crs-4', code: 'CS501', name: 'Operating Systems', branch: 'Computer Science', semester: 5, credits: 4, facultyId: 'fac-2' },
  { id: 'crs-5', code: 'CS502', name: 'Machine Learning', branch: 'Computer Science', semester: 5, credits: 3, facultyId: 'fac-2' },
  { id: 'crs-6', code: 'CS503', name: 'Software Engineering', branch: 'Computer Science', semester: 5, credits: 3, facultyId: 'fac-1' },
];

function save(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2));
  console.log(`  wrote ${name}.json`);
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

console.log('Seeding DEMO data...');
save('users', users);
save('faculty', faculty);
save('students', students);
save('settings', DEFAULT_SETTINGS);
save('courses', courses);

// Empty files that later phases will fill
['attendance', 'marks', 'placementDrives', 'applications', 'resumes'].forEach((name) =>
  save(name, [])
);

console.log('\nDone. Demo logins:');
console.log('  Admin   : admin@demo.college.edu          / Admin@123');
console.log('  Faculty : meera.rao@demo.college.edu      / Faculty@123');
console.log('  Student : riya.sharma@demo.college.edu    / Student@123');