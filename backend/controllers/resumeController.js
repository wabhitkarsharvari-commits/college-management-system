const { readAll, modify } = require('../utils/fileDb');
const { findStudentByUserId } = require('../utils/lookups');
const { cleanString, httpError } = require('../utils/validators');

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

async function getStudent(req) {
  const student = await findStudentByUserId(req.user.id);
  if (!student) throw httpError(404, 'Student profile not found.');
  return student;
}

function cap(value, max = 200) {
  return cleanString(value, max);
}

function cleanList(arr, itemFn) {
  if (!Array.isArray(arr)) return [];
  return arr.map(itemFn).filter(Boolean);
}

function parseResume(body) {
  const b = body || {};

  // Personal info
  const personal = {
    phone:    cap(b.personal?.phone    || '', 20),
    address:  cap(b.personal?.address  || '', 200),
    linkedin: cap(b.personal?.linkedin || '', 200),
    github:   cap(b.personal?.github   || '', 200),
    website:  cap(b.personal?.website  || '', 200),
  };

  // Objective / summary
  const objective = cap(b.objective || '', 1000);

  // Education entries
  const education = cleanList(b.education, (e) => {
    const degree     = cap(e.degree     || '', 150);
    const institution = cap(e.institution || '', 150);
    if (!degree && !institution) return null;
    return {
      degree,
      institution,
      year:       cap(e.year       || '', 10),
      percentage: cap(e.percentage || '', 10),
    };
  });

  // Skills — stored as a plain string (comma-separated) or array
  let skills = '';
  if (typeof b.skills === 'string') {
    skills = cap(b.skills, 1000);
  } else if (Array.isArray(b.skills)) {
    skills = b.skills.map((s) => cap(s, 100)).filter(Boolean).join(', ');
  }

  // Experience entries
  const experience = cleanList(b.experience, (e) => {
    const company = cap(e.company || '', 150);
    const role    = cap(e.role    || '', 150);
    if (!company && !role) return null;
    return {
      company,
      role,
      duration:    cap(e.duration    || '', 60),
      description: cap(e.description || '', 1000),
    };
  });

  // Projects
  const projects = cleanList(b.projects, (p) => {
    const title = cap(p.title || '', 150);
    if (!title) return null;
    return {
      title,
      tech:        cap(p.tech        || '', 200),
      description: cap(p.description || '', 1000),
      link:        cap(p.link        || '', 200),
    };
  });

  // Certifications
  const certifications = cleanList(b.certifications, (c) => {
    const name = cap(c.name || '', 150);
    if (!name) return null;
    return {
      name,
      issuer: cap(c.issuer || '', 100),
      year:   cap(c.year   || '', 10),
    };
  });

  // Extra-curricular / achievements
  const achievements = cap(b.achievements || '', 1000);

  // Languages
  const languages = cleanList(b.languages, (l) => {
    const name = cap(l.name || l || '', 60);
    if (!name) return null;
    return { name, level: cap(l.level || '', 30) };
  });

  return {
    personal,
    objective,
    education,
    skills,
    experience,
    projects,
    certifications,
    achievements,
    languages,
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------
// GET /api/students/resume
// Returns the stored resume or an empty template.
// ---------------------------------------------------------------
async function getResume(req, res, next) {
  try {
    const student  = await getStudent(req);
    const resumes  = await readAll('resumes');
    const existing = resumes.find((r) => r.studentId === student.id);

    if (existing) {
      return res.json({ resume: existing });
    }

    // Return a blank template pre-filled with profile data
    res.json({
      resume: {
        studentId:    student.id,
        personal:     { phone: '', address: '', linkedin: '', github: '', website: '' },
        objective:    '',
        education:    [
          {
            degree:      `B.Tech — ${student.branch}`,
            institution: '',
            year:        '',
            percentage:  student.academicPercentage ? String(student.academicPercentage) : '',
          },
        ],
        skills:         '',
        experience:     [],
        projects:       [],
        certifications: [],
        achievements:   '',
        languages:      [{ name: 'English', level: 'Proficient' }],
        updatedAt:      null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------
// PUT /api/students/resume
// Upserts the student's resume.
// ---------------------------------------------------------------
async function saveResume(req, res, next) {
  try {
    const student = await getStudent(req);
    const data    = parseResume(req.body);

    const resume = await modify('resumes', (resumes) => {
      const idx = resumes.findIndex((r) => r.studentId === student.id);
      const record = { studentId: student.id, ...data };
      if (idx === -1) {
        resumes.push(record);
      } else {
        resumes[idx] = record;
      }
      return record;
    });

    res.json({ resume, message: 'Resume saved successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getResume, saveResume };
