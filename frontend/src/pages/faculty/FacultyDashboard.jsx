import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';
import { useAuth } from '../../context/AuthContext';

function gradeLabel(pct) {
  if (pct >= 90) return { g: 'O',   cls: 'grade-good' };
  if (pct >= 80) return { g: 'A+',  cls: 'grade-good' };
  if (pct >= 70) return { g: 'A',   cls: 'grade-good' };
  if (pct >= 60) return { g: 'B+',  cls: 'grade-good' };
  if (pct >= 50) return { g: 'B',   cls: 'grade-good' };
  if (pct >= 40) return { g: 'C',   cls: 'grade-good' };
  return               { g: 'F',   cls: 'grade-low'  };
}

// Mini horizontal bar
function MiniBar({ value, max, color = '#3b82f6' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="fac-mini-bar-wrap">
      <div className="fac-mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// Course summary card
function CourseCard({ course, attendanceData, marksData, students }) {
  const stuCount = students.filter(
    (s) => s.branch === course.branch && String(s.semester) === String(course.semester)
  ).length;

  const totalClasses = new Set(
    attendanceData.map((r) => r.date)
  ).size;

  const present = attendanceData.filter((r) => r.status === 'Present').length;
  const totalAtt = attendanceData.filter(
    (r) => r.status === 'Present' || r.status === 'Absent'
  ).length;
  const attPct = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : null;

  const recordedMarks = marksData.filter(
    (r) => r.marks !== '' && r.marks !== undefined
  );
  const avgMarks =
    recordedMarks.length > 0
      ? recordedMarks.reduce((s, r) => s + Number(r.marks), 0) / recordedMarks.length
      : null;
  const maxM = recordedMarks[0]?.maxMarks ?? 100;
  const avgPct = avgMarks !== null ? (avgMarks / maxM) * 100 : null;

  const BRANCH_COLORS = {
    'Information Technology': '#3b82f6',
    'Computer Science':       '#8b5cf6',
    'Electronics':            '#f59e0b',
    'Mechanical':             '#10b981',
    'Civil':                  '#ef4444',
  };
  const accent = BRANCH_COLORS[course.branch] || '#64748b';

  return (
    <div className="fac-course-card" style={{ borderTopColor: accent }}>
      <div className="fac-course-card-top">
        <span className="fac-course-badge" style={{ background: accent }}>{course.code}</span>
        <span className="fac-credits-badge">{course.credits} cr</span>
      </div>
      <h3 className="fac-course-name">{course.name}</h3>
      <p className="fac-course-meta">{course.branch} · Sem {course.semester}</p>

      <div className="fac-course-stats">
        <div className="fac-course-stat">
          <span className="fac-cs-label">Students</span>
          <span className="fac-cs-value">{stuCount}</span>
        </div>
        <div className="fac-course-stat">
          <span className="fac-cs-label">Classes held</span>
          <span className="fac-cs-value">{totalClasses}</span>
        </div>
        <div className="fac-course-stat">
          <span className="fac-cs-label">Attendance</span>
          <span className="fac-cs-value">{attPct !== null ? `${attPct}%` : '—'}</span>
        </div>
        <div className="fac-course-stat">
          <span className="fac-cs-label">Avg Marks</span>
          <span className="fac-cs-value">
            {avgPct !== null ? `${avgPct.toFixed(0)}%` : '—'}
          </span>
        </div>
      </div>

      {attPct !== null && (
        <MiniBar value={present} max={totalAtt} color={attPct < 75 ? '#ef4444' : '#10b981'} />
      )}

      <div className="fac-course-actions">
        <Link to="/faculty/attendance" className="btn btn-secondary btn-small">Attendance</Link>
        <Link to="/faculty/marks"      className="btn btn-secondary btn-small">Marks</Link>
      </div>
    </div>
  );
}

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [courses, setCourses]         = useState([]);
  const [students, setStudents]       = useState([]);
  const [courseDetails, setCourseDetails] = useState({}); // { courseId: { attendance, marks } }
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [errors, setErrors]           = useState([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const messages = [];

    const [coursesRes, studentsRes] = await Promise.allSettled([
      apiRequest('/courses/mine'),
      apiRequest('/students'),
    ]);

    let loadedCourses = [];
    let loadedStudents = [];

    if (coursesRes.status === 'fulfilled') {
      loadedCourses = Array.isArray(coursesRes.value?.courses)
        ? coursesRes.value.courses.filter(Boolean) : [];
    } else {
      messages.push(coursesRes.reason?.message || 'Could not load courses.');
    }
    if (studentsRes.status === 'fulfilled') {
      loadedStudents = Array.isArray(studentsRes.value?.students)
        ? studentsRes.value.students.filter(Boolean) : [];
    } else {
      messages.push(studentsRes.reason?.message || 'Could not load students.');
    }

    // Fan-out: attendance + marks per course
    const detailResults = await Promise.allSettled(
      loadedCourses.map(async (c) => {
        const [attRes, mrkRes] = await Promise.allSettled([
          apiRequest(`/attendance/course/${encodeURIComponent(c.id)}`),
          apiRequest(`/marks/course/${encodeURIComponent(c.id)}`),
        ]);
        return {
          courseId: c.id,
          attendance: attRes.status === 'fulfilled'
            ? (attRes.value?.attendance || []) : [],
          marks: mrkRes.status === 'fulfilled'
            ? (mrkRes.value?.marks || []) : [],
        };
      })
    );

    const details = {};
    detailResults.forEach((r) => {
      if (r.status === 'fulfilled') {
        details[r.value.courseId] = {
          attendance: r.value.attendance,
          marks: r.value.marks,
        };
      }
    });

    setCourses(loadedCourses);
    setStudents(loadedStudents);
    setCourseDetails(details);
    setErrors([...new Set(messages)]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader />;

  // ── aggregated stats ──────────────────────────────────────
  const matchingStudents = [
    ...new Map(
      students
        .filter((s) => courses.some(
          (c) => s.branch === c.branch && String(s.semester) === String(c.semester)
        ))
        .map((s) => [s.id, s])
    ).values(),
  ];

  let totalPresent = 0, totalAttRec = 0;
  let totalObtained = 0, totalMaxMarks = 0, marksStudents = 0;

  courses.forEach((c) => {
    const d = courseDetails[c.id] || { attendance: [], marks: [] };
    d.attendance.forEach((r) => {
      if (r.status === 'Present') totalPresent++;
      if (r.status === 'Present' || r.status === 'Absent') totalAttRec++;
    });
    d.marks.forEach((r) => {
      if (r.marks !== '' && r.marks !== undefined) {
        totalObtained += Number(r.marks);
        totalMaxMarks += Number(r.maxMarks || 100);
        marksStudents++;
      }
    });
  });

  const overallAtt  = totalAttRec  > 0 ? Math.round((totalPresent / totalAttRec) * 100) : null;
  const overallMarks = totalMaxMarks > 0 ? ((totalObtained / totalMaxMarks) * 100).toFixed(1) : null;
  const avgGrade = overallMarks !== null ? gradeLabel(Number(overallMarks)) : null;

  // Students at risk (attendance < 75%)
  const atRisk = matchingStudents.filter((s) => {
    let pr = 0, tot = 0;
    courses.forEach((c) => {
      const d = courseDetails[c.id] || { attendance: [] };
      d.attendance.forEach((r) => {
        if (r.studentId === s.id) {
          if (r.status === 'Present') pr++;
          if (r.status === 'Present' || r.status === 'Absent') tot++;
        }
      });
    });
    return tot > 0 && (pr / tot) * 100 < 75;
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <>
      {/* ── Hero banner ── */}
      <div className="fac-hero">
        <div className="fac-hero-left">
          <div className="fac-avatar">{(user?.name || 'F').charAt(0)}</div>
          <div>
            <p className="fac-greeting">{greeting},</p>
            <h1 className="fac-name">{user?.name ?? 'Faculty'}</h1>
            <p className="fac-date">📅 {today}</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-small fac-refresh-btn"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {errors.map((msg, i) => (
        <Alert key={i} type="error">{msg}</Alert>
      ))}

      {/* ── Stat cards ── */}
      <div className="card-grid">
        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="stat-title">Assigned Courses</div>
          <div className="stat-value">{courses.length}</div>
          <div className="stat-hint">Active this semester</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="stat-title">My Students</div>
          <div className="stat-value">{matchingStudents.length}</div>
          <div className="stat-hint">Across all your classes</div>
        </div>
        <div className="stat-card"
          style={{ borderLeftColor: overallAtt !== null && overallAtt < 75 ? '#ef4444' : '#10b981' }}>
          <div className="stat-title">Overall Attendance</div>
          <div className="stat-value">{overallAtt !== null ? `${overallAtt}%` : '—'}</div>
          <div className="stat-hint">{totalAttRec} entries recorded</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-title">Avg Class Marks</div>
          <div className="stat-value">
            {overallMarks !== null ? `${overallMarks}%` : '—'}
          </div>
          <div className="stat-hint">
            {avgGrade ? (
              <span className={`performance-grade ${avgGrade.cls}`} style={{ fontSize: '0.75rem' }}>
                {avgGrade.g}
              </span>
            ) : 'No marks recorded'}
          </div>
        </div>
      </div>

      {/* ── Quick nav ── */}
      <div className="fac-quick-nav">
        {[
          { to: '/faculty/courses',     icon: '📚', label: 'My Courses',         sub: 'Browse assigned subjects' },
          { to: '/faculty/attendance',  icon: '✅', label: 'Take Attendance',     sub: 'Mark daily attendance' },
          { to: '/faculty/marks',       icon: '📝', label: 'Enter Marks',         sub: 'Save exam scores' },
          { to: '/faculty/performance', icon: '📊', label: 'Performance',         sub: 'Analytics & insights' },
        ].map(({ to, icon, label, sub }) => (
          <Link key={to} to={to} className="fac-nav-tile">
            <span className="fac-nav-icon">{icon}</span>
            <span className="fac-nav-label">{label}</span>
            <span className="fac-nav-sub">{sub}</span>
          </Link>
        ))}
      </div>

      {/* ── Course cards ── */}
      <div className="fac-section-header">
        <h2>My Courses</h2>
        <span className="fac-section-count">{courses.length} subjects</span>
      </div>

      {courses.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <h3>No courses assigned yet</h3>
            <p>Ask the administrator to assign courses to your account.</p>
          </div>
        </div>
      ) : (
        <div className="fac-course-cards-grid">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              attendanceData={courseDetails[c.id]?.attendance || []}
              marksData={courseDetails[c.id]?.marks || []}
              students={students}
            />
          ))}
        </div>
      )}

      {/* ── At-risk students panel ── */}
      {atRisk.length > 0 && (
        <div className="panel fac-risk-panel">
          <div className="fac-risk-header">
            <h2>⚠ Students Below 75% Attendance</h2>
            <span className="fac-risk-count">{atRisk.length} student{atRisk.length !== 1 ? 's' : ''}</span>
          </div>
          <p className="fac-risk-hint">
            These students need attention. Consider reaching out or issuing a notice.
          </p>
          <div className="fac-risk-list">
            {atRisk.map((s) => {
              let pr = 0, tot = 0;
              courses.forEach((c) => {
                (courseDetails[c.id]?.attendance || []).forEach((r) => {
                  if (r.studentId === s.id) {
                    if (r.status === 'Present') pr++;
                    if (r.status === 'Present' || r.status === 'Absent') tot++;
                  }
                });
              });
              const pct = tot > 0 ? Math.round((pr / tot) * 100) : 0;
              return (
                <div key={s.id} className="fac-risk-row">
                  <div className="fac-risk-avatar">{s.name.charAt(0)}</div>
                  <div className="fac-risk-info">
                    <strong>{s.name}</strong>
                    <small>{s.enrollmentNo} · {s.branch}</small>
                  </div>
                  <div className="fac-risk-pct-col">
                    <span className="fac-risk-pct">{pct}%</span>
                    <div className="fac-mini-bar-wrap" style={{ width: 80 }}>
                      <div
                        className="fac-mini-bar-fill"
                        style={{ width: `${pct}%`, background: '#ef4444' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Student marks snapshot ── */}
      {matchingStudents.length > 0 && (
        <div className="panel">
          <div className="fac-section-header" style={{ marginBottom: 16 }}>
            <h2>Student Marks Snapshot</h2>
            <Link to="/faculty/performance" className="btn btn-secondary btn-small">
              Full Report →
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="dt-table">
              <thead>
                <tr>
                  <th className="dt-th">Student</th>
                  <th className="dt-th">Enrollment</th>
                  <th className="dt-th">Branch</th>
                  {courses.map((c) => (
                    <th key={c.id} className="dt-th" title={c.name}>
                      {c.code}
                    </th>
                  ))}
                  <th className="dt-th">Avg</th>
                </tr>
              </thead>
              <tbody>
                {matchingStudents.slice(0, 8).map((s) => {
                  const scores = courses.map((c) => {
                    const rec = (courseDetails[c.id]?.marks || []).find(
                      (m) => m.studentId === s.id
                    );
                    if (!rec || rec.marks === '' || rec.marks === undefined) return null;
                    return { marks: Number(rec.marks), max: Number(rec.maxMarks || 100) };
                  });
                  const valid = scores.filter(Boolean);
                  const avg = valid.length > 0
                    ? valid.reduce((sum, r) => sum + (r.marks / r.max) * 100, 0) / valid.length
                    : null;
                  const gl = avg !== null ? gradeLabel(avg) : null;

                  return (
                    <tr key={s.id} className="dt-row">
                      <td className="dt-td">
                        <div className="fac-stu-name-cell">
                          <div className="fac-stu-mini-avatar">{s.name.charAt(0)}</div>
                          <strong>{s.name}</strong>
                        </div>
                      </td>
                      <td className="dt-td">{s.enrollmentNo}</td>
                      <td className="dt-td">{s.branch.replace('Information Technology', 'IT').replace('Computer Science', 'CS')}</td>
                      {scores.map((sc, i) => (
                        <td key={i} className="dt-td">
                          {sc !== null ? (
                            <span style={{ fontWeight: 600 }}>{sc.marks}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      ))}
                      <td className="dt-td">
                        {gl ? (
                          <span className={`performance-grade ${gl.cls}`}>{gl.g}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {matchingStudents.length > 8 && (
            <p style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing 8 of {matchingStudents.length} students.{' '}
              <Link to="/faculty/performance">View all →</Link>
            </p>
          )}
        </div>
      )}
    </>
  );
}
