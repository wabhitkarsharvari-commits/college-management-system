import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

const BRANCH_COLORS = {
  'Information Technology': '#3b82f6',
  'Computer Science':       '#8b5cf6',
  'Electronics':            '#f59e0b',
  'Mechanical':             '#10b981',
  'Civil':                  '#ef4444',
};

export default function MyCourses() {
  const [courses, setCourses]   = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  useEffect(() => {
    Promise.allSettled([
      apiRequest('/courses/mine'),
      apiRequest('/students'),
    ]).then(([cRes, sRes]) => {
      if (cRes.status === 'fulfilled') {
        setCourses(Array.isArray(cRes.value?.courses) ? cRes.value.courses.filter(Boolean) : []);
      } else {
        setError(cRes.reason?.message || 'Could not load courses.');
      }
      if (sRes.status === 'fulfilled') {
        setStudents(Array.isArray(sRes.value?.students) ? sRes.value.students.filter(Boolean) : []);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const branches = [...new Set(courses.map((c) => c.branch))];

  const filteredCourses = courses.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    const matchesBranch = !branchFilter || c.branch === branchFilter;
    return matchesSearch && matchesBranch;
  });

  // Students per course
  function studentsForCourse(course) {
    return students.filter(
      (s) => s.branch === course.branch && String(s.semester) === String(course.semester)
    );
  }

  // All matching students across assigned courses
  const allMyStudents = [
    ...new Map(
      students
        .filter((s) => courses.some(
          (c) => s.branch === c.branch && String(s.semester) === String(c.semester)
        ))
        .map((s) => [s.id, s])
    ).values(),
  ];

  const filteredStudents = allMyStudents.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.enrollmentNo.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="page-header fac-page-header">
        <div>
          <h1>My Courses</h1>
          <p>Assigned subjects and enrolled students for this semester.</p>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Summary strip */}
      <div className="card-grid">
        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="stat-title">Total Courses</div>
          <div className="stat-value">{courses.length}</div>
          <div className="stat-hint">Assigned to you</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="stat-title">Total Students</div>
          <div className="stat-value">{allMyStudents.length}</div>
          <div className="stat-hint">Across your classes</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="stat-title">Branches</div>
          <div className="stat-value">{branches.length}</div>
          <div className="stat-hint">{branches.map((b) => b.split(' ')[0]).join(', ')}</div>
        </div>
      </div>

      {/* ── Search / filter bar ── */}
      <div className="fac-search-bar">
        <input
          type="search"
          placeholder="Search courses or students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="fac-search-input"
        />
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="fac-search-select"
        >
          <option value="">All branches</option>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* ── Course cards ── */}
      <div className="fac-section-header">
        <h2>Courses ({filteredCourses.length})</h2>
      </div>
      <div className="fac-course-cards-grid">
        {filteredCourses.map((c) => {
          const studs = studentsForCourse(c);
          const accent = BRANCH_COLORS[c.branch] || '#64748b';
          return (
            <div key={c.id} className="fac-course-card" style={{ borderTopColor: accent }}>
              <div className="fac-course-card-top">
                <span className="fac-course-badge" style={{ background: accent }}>{c.code}</span>
                <span className="fac-credits-badge">{c.credits} cr</span>
              </div>
              <h3 className="fac-course-name">{c.name}</h3>
              <p className="fac-course-meta">{c.branch} · Sem {c.semester}</p>
              <div className="fac-course-stats">
                <div className="fac-course-stat">
                  <span className="fac-cs-label">Students</span>
                  <span className="fac-cs-value">{studs.length}</span>
                </div>
              </div>
              <div className="fac-course-actions">
                <Link to="/faculty/attendance" className="btn btn-secondary btn-small">Attendance</Link>
                <Link to="/faculty/marks"      className="btn btn-secondary btn-small">Marks</Link>
              </div>
            </div>
          );
        })}
      </div>
      {filteredCourses.length === 0 && (
        <div className="panel">
          <div className="empty-state">
            <h3>No courses found</h3>
            <p>Try clearing the search or filter.</p>
          </div>
        </div>
      )}

      {/* ── Student list ── */}
      <div className="fac-section-header" style={{ marginTop: 8 }}>
        <h2>Students in My Classes ({filteredStudents.length})</h2>
      </div>
      <div className="panel">
        {filteredStudents.length === 0 ? (
          <div className="empty-state">
            <h3>No students found</h3>
            <p>No students match your search.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt-table">
              <thead>
                <tr>
                  <th className="dt-th">Student</th>
                  <th className="dt-th">Enrollment No.</th>
                  <th className="dt-th">Branch</th>
                  <th className="dt-th">Semester</th>
                  <th className="dt-th">CGPA</th>
                  <th className="dt-th">Email</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="dt-row">
                    <td className="dt-td">
                      <div className="fac-stu-name-cell">
                        <div
                          className="fac-stu-mini-avatar"
                          style={{ background: BRANCH_COLORS[s.branch] || '#64748b' }}
                        >
                          {s.name.charAt(0)}
                        </div>
                        <strong>{s.name}</strong>
                      </div>
                    </td>
                    <td className="dt-td">{s.enrollmentNo}</td>
                    <td className="dt-td">{s.branch}</td>
                    <td className="dt-td">Sem {s.semester}</td>
                    <td className="dt-td">
                      <span style={{ fontWeight: 700, color: s.cgpa >= 7 ? '#166534' : '#92400e' }}>
                        {s.cgpa}
                      </span>
                    </td>
                    <td className="dt-td">{s.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
