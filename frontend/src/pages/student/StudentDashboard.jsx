import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';
import { useAuth } from '../../context/AuthContext';

function gradeLabel(pct) {
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  return 'F';
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [marks, setMarks] = useState([]);
  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const results = await Promise.allSettled([
        apiRequest('/students/me'),
        apiRequest('/courses/mine'),
        apiRequest('/students/attendance'),
        apiRequest('/students/marks'),
        apiRequest('/students/placements'),
        apiRequest('/students/applications'),
      ]);

      const messages = [];
      function get(i, label) {
        const r = results[i];
        if (r.status === 'rejected') {
          messages.push(`${label}: ${r.reason?.message || 'Could not load.'}`);
          return null;
        }
        return r.value;
      }

      const profileData     = get(0, 'Profile');
      const courseData      = get(1, 'Courses');
      const attendanceData  = get(2, 'Attendance');
      const marksData       = get(3, 'Marks');
      const driveData       = get(4, 'Placement drives');
      const applicationData = get(5, 'Applications');

      if (profileData) {
        setProfile(profileData.student || profileData.profile || profileData);
      }
      if (courseData) {
        setCourses(Array.isArray(courseData.courses) ? courseData.courses : []);
      }
      if (attendanceData) {
        setAttendance(
          Array.isArray(attendanceData.attendance) ? attendanceData.attendance : []
        );
        setAttendanceSummary(attendanceData.summary || null);
      }
      if (marksData) {
        setMarks(Array.isArray(marksData.marks) ? marksData.marks : []);
      }
      if (driveData) {
        setDrives(
          Array.isArray(driveData.drives)
            ? driveData.drives
            : Array.isArray(driveData.placements)
              ? driveData.placements
              : []
        );
      }
      if (applicationData) {
        setApplications(
          Array.isArray(applicationData.applications)
            ? applicationData.applications
            : []
        );
      }

      if (messages.length) setError(messages.join(' '));
    } catch (err) {
      setError(err?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) return <Loader />;

  // Attendance
  const presentCount = attendanceSummary?.present
    ?? attendance.filter((r) => r.status === 'Present').length;
  const absentCount = attendanceSummary?.absent
    ?? attendance.filter((r) => r.status === 'Absent').length;
  const totalAttendance = presentCount + absentCount;
  const attendancePct = totalAttendance
    ? ((presentCount / totalAttendance) * 100).toFixed(1)
    : null;
  const attendanceLow = attendancePct !== null && Number(attendancePct) < 75;

  // Marks
  const obtainedMarks = marks.reduce((t, r) => t + (Number(r.marks) || 0), 0);
  const maximumMarks  = marks.reduce((t, r) => t + (Number(r.maxMarks) || 0), 0);
  const marksPct = maximumMarks > 0
    ? ((obtainedMarks / maximumMarks) * 100).toFixed(1)
    : null;

  // Eligible drives
  const eligibleDrives = drives.filter((drive) => {
    const cgpa = profile?.cgpa ?? 0;
    const cgpaOk = !drive.minCgpa || cgpa >= drive.minCgpa;
    return cgpaOk;
  });

  // Per-course marks rows (only courses with a marks record)
  const marksWithCourse = marks.filter(
    (m) => m.courseName && (m.marks !== '' && m.marks !== undefined)
  );

  return (
    <>
      <div className="page-header student-dashboard-header">
        <div>
          <h1>Student Dashboard</h1>
          <p>
            Welcome{profile?.name ? `, ${profile.name}` : ''}! Track your
            academic progress and placement opportunities.
          </p>
        </div>
        <button
          type="button"
          className="student-refresh-btn"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Stat cards */}
      <div className="card-grid">
        <div
          className="stat-card"
          style={{ borderLeftColor: attendanceLow ? '#ef4444' : '#10b981' }}
        >
          <div className="stat-title">Attendance</div>
          <div className="stat-value">
            {attendancePct === null ? '—' : `${attendancePct}%`}
          </div>
          <div className="stat-hint">
            {presentCount} present · {absentCount} absent
            {attendanceLow && (
              <span className="stu-warn"> ⚠ Below 75%</span>
            )}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="stat-title">CGPA</div>
          <div className="stat-value">{profile?.cgpa ?? '—'}</div>
          <div className="stat-hint">Academic percentage: {profile?.academicPercentage ?? '—'}%</div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-title">Marks</div>
          <div className="stat-value">
            {marksPct === null ? '—' : `${marksPct}%`}
          </div>
          <div className="stat-hint">
            {obtainedMarks} / {maximumMarks} marks recorded
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="stat-title">Eligible Drives</div>
          <div className="stat-value">{eligibleDrives.length}</div>
          <div className="stat-hint">
            {applications.length} application{applications.length !== 1 ? 's' : ''} submitted
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="card-grid stu-quick-links">
        <Link to="/student/profile" className="stu-quick-link">
          <span className="sql-icon">👤</span>
          <span>My Profile</span>
          <small>View details &amp; enrolled subjects</small>
        </Link>
        <Link to="/student/attendance" className="stu-quick-link">
          <span className="sql-icon">📅</span>
          <span>Attendance</span>
          <small>Your daily attendance log</small>
        </Link>
        <Link to="/student/results" className="stu-quick-link">
          <span className="sql-icon">📝</span>
          <span>Marks &amp; Grades</span>
          <small>Exam scores and grades</small>
        </Link>
        <Link to="/student/placements" className="stu-quick-link">
          <span className="sql-icon">🏢</span>
          <span>Placement Drives</span>
          <small>Upcoming opportunities</small>
        </Link>
      </div>

      <div className="card-grid student-detail-grid">

        {/* Attendance breakdown */}
        <div className="panel">
          <h2>Attendance Breakdown</h2>
          {totalAttendance === 0 ? (
            <p>No attendance records yet.</p>
          ) : (
            <>
              <div className="stu-att-bar-wrap">
                <div
                  className="stu-att-bar-fill"
                  style={{
                    width: `${attendancePct}%`,
                    background: attendanceLow ? '#ef4444' : '#10b981',
                  }}
                />
              </div>
              <p style={{ marginTop: 10 }}>
                <strong>{attendancePct}%</strong> overall —{' '}
                {presentCount} present, {absentCount} absent out of {totalAttendance} classes
              </p>
              {attendanceLow && (
                <Alert type="warning">
                  Your attendance is below the 75% threshold. Please attend classes regularly.
                </Alert>
              )}

              {/* Recent attendance per course */}
              {attendance.length > 0 && (
                <>
                  <h3 style={{ marginTop: 16 }}>Recent Records</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dt-table">
                      <thead>
                        <tr>
                          <th className="dt-th">Date</th>
                          <th className="dt-th">Course</th>
                          <th className="dt-th">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.slice(0, 8).map((rec, i) => (
                          <tr key={i} className="dt-row">
                            <td className="dt-td">{rec.date}</td>
                            <td className="dt-td">{rec.courseName || '—'}</td>
                            <td className="dt-td">
                              <span className={`att-badge att-${rec.status?.toLowerCase()}`}>
                                {rec.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {attendance.length > 8 && (
                    <p style={{ marginTop: 8 }}>
                      <Link to="/student/attendance">View all {attendance.length} records →</Link>
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Marks per course */}
        <div className="panel">
          <h2>Marks &amp; Grades</h2>
          {marksWithCourse.length === 0 ? (
            <p>No marks have been recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="dt-table">
                <thead>
                  <tr>
                    <th className="dt-th">Course</th>
                    <th className="dt-th">Marks</th>
                    <th className="dt-th">%</th>
                    <th className="dt-th">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {marksWithCourse.map((rec, i) => {
                    const pct =
                      Number(rec.maxMarks) > 0
                        ? (Number(rec.marks) / Number(rec.maxMarks)) * 100
                        : null;
                    const grade = pct !== null ? gradeLabel(pct) : '—';
                    return (
                      <tr key={i} className="dt-row">
                        <td className="dt-td">{rec.courseName}</td>
                        <td className="dt-td">
                          {rec.marks} / {rec.maxMarks}
                        </td>
                        <td className="dt-td">
                          {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                        </td>
                        <td className="dt-td">
                          <span
                            className={`performance-grade ${
                              grade === 'F' ? 'grade-low' : 'grade-good'
                            }`}
                          >
                            {grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Enrolled courses summary */}
          <h3 style={{ marginTop: 20 }}>Enrolled Subjects ({courses.length})</h3>
          {courses.length === 0 ? (
            <p>No subjects found for your branch and semester.</p>
          ) : (
            <ul className="stu-course-list">
              {courses.map((c, i) => (
                <li key={c.id || i}>
                  <span className="course-code-badge">{c.code}</span>{' '}
                  {c.name}
                  {c.facultyName && (
                    <small> — {c.facultyName}</small>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {/* Active placement drives */}
      <div className="panel">
        <div className="stu-drives-header">
          <h2>Active Placement Drives</h2>
          <Link to="/student/placements" className="btn btn-secondary btn-small">
            View All →
          </Link>
        </div>
        {eligibleDrives.length === 0 ? (
          <p>No active placement drives are available right now.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt-table">
              <thead>
                <tr>
                  <th className="dt-th">Company</th>
                  <th className="dt-th">Role</th>
                  <th className="dt-th">Location</th>
                  <th className="dt-th">Deadline</th>
                  <th className="dt-th">Min. CGPA</th>
                </tr>
              </thead>
              <tbody>
                {eligibleDrives.slice(0, 5).map((drive, i) => (
                  <tr key={drive.id || i} className="dt-row">
                    <td className="dt-td"><strong>{drive.company}</strong></td>
                    <td className="dt-td">{drive.role}</td>
                    <td className="dt-td">{drive.location}</td>
                    <td className="dt-td">{drive.deadline}</td>
                    <td className="dt-td">{drive.minCgpa ?? 0}</td>
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
