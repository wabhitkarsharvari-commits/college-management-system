import { useEffect, useState } from 'react';
import { apiRequest } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

export default function Attendance() {
  const [courses, setCourses]   = useState([]);
  const [courseId, setCourseId] = useState('');
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [saving, setSaving]     = useState(false);

  // Load courses once
  useEffect(() => {
    apiRequest('/courses/mine')
      .then((data) => {
        const list = Array.isArray(data?.courses) ? data.courses : [];
        setCourses(list);
        if (list.length) setCourseId(list[0].id);
      })
      .catch((err) => setError(err.message || 'Could not load courses.'))
      .finally(() => setLoading(false));
  }, []);

  // Load roster whenever course or date changes
  useEffect(() => {
    if (!courseId || !date) { setStudents([]); setStatuses({}); return; }
    let active = true;
    setLoadingAtt(true);
    setError(''); setMessage('');

    apiRequest(`/attendance/course/${encodeURIComponent(courseId)}?date=${encodeURIComponent(date)}`)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.attendance) ? data.attendance : [];
        setStudents(list);
        const next = {};
        list.forEach((s) => {
          next[s.studentId] = ['Present', 'Absent'].includes(s.status) ? s.status : '';
        });
        setStatuses(next);
      })
      .catch((err) => { if (active) { setStudents([]); setStatuses({}); setError(err.message); } })
      .finally(() => { if (active) setLoadingAtt(false); });

    return () => { active = false; };
  }, [courseId, date]);

  function markAll(status) {
    const next = {};
    students.forEach((s) => { next[s.studentId] = status; });
    setStatuses(next);
    setMessage('');
  }

  function toggle(studentId) {
    setStatuses((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent'
                 : prev[studentId] === 'Absent'  ? 'Present'
                 : 'Present',
    }));
    setMessage('');
  }

  async function saveAttendance() {
    setError(''); setMessage('');
    if (!students.length) { setError('No students found for this course.'); return; }
    const incomplete = students.some((s) => !statuses[s.studentId]);
    if (incomplete) { setError('Mark every student before saving.'); return; }

    setSaving(true);
    try {
      await apiRequest('/attendance', {
        method: 'POST',
        body: {
          courseId, date,
          records: students.map((s) => ({ studentId: s.studentId, status: statuses[s.studentId] })),
        },
      });
      setMessage('Attendance saved successfully.');
    } catch (err) {
      setError(err.message || 'Could not save attendance.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;

  const presentCount = Object.values(statuses).filter((v) => v === 'Present').length;
  const absentCount  = Object.values(statuses).filter((v) => v === 'Absent').length;
  const markedCount  = presentCount + absentCount;
  const selectedCourse = courses.find((c) => c.id === courseId);

  return (
    <>
      <div className="page-header fac-page-header">
        <div>
          <h1>Attendance</h1>
          <p>Record and update daily attendance for your assigned courses.</p>
        </div>
      </div>

      {error   && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      {/* ── Controls ── */}
      <div className="panel fac-att-controls">
        <div className="fac-att-selectors">
          <div className="form-group">
            <label htmlFor="att-course">Course</label>
            <select
              id="att-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="att-date">Date</label>
            <input
              id="att-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {selectedCourse && (
          <div className="fac-att-course-info">
            <span className="course-code-badge">{selectedCourse.code}</span>
            <span>{selectedCourse.branch}</span>
            <span>Semester {selectedCourse.semester}</span>
            <span>{selectedCourse.credits} credits</span>
          </div>
        )}
      </div>

      {/* ── Live counter strip ── */}
      {students.length > 0 && (
        <div className="fac-att-counter-strip">
          <div className="fac-att-counter fac-att-counter-present">
            <span className="fac-att-count-val">{presentCount}</span>
            <span>Present</span>
          </div>
          <div className="fac-att-counter fac-att-counter-absent">
            <span className="fac-att-count-val">{absentCount}</span>
            <span>Absent</span>
          </div>
          <div className="fac-att-counter">
            <span className="fac-att-count-val">{students.length - markedCount}</span>
            <span>Pending</span>
          </div>
          <div className="fac-att-counter-pct">
            {markedCount > 0
              ? `${Math.round((presentCount / markedCount) * 100)}% present`
              : 'Not yet marked'}
          </div>

          <div className="fac-att-bulk-btns">
            <button type="button" className="fac-bulk-btn fac-bulk-present" onClick={() => markAll('Present')}>
              ✓ Mark All Present
            </button>
            <button type="button" className="fac-bulk-btn fac-bulk-absent" onClick={() => markAll('Absent')}>
              ✗ Mark All Absent
            </button>
          </div>
        </div>
      )}

      {/* ── Roster ── */}
      <div className="panel">
        <h2>Attendance Register</h2>
        <p className="fac-att-date-label">📅 {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

        {loadingAtt ? (
          <Loader />
        ) : students.length === 0 ? (
          <div className="empty-state">
            <h3>{courseId ? 'No students found' : 'Select a course'}</h3>
            <p>{courseId ? 'No students are enrolled in this branch and semester.' : 'Choose a course from the selector above.'}</p>
          </div>
        ) : (
          <div className="fac-att-grid">
            {students.map((s) => {
              const status = statuses[s.studentId] || '';
              return (
                <div
                  key={s.studentId}
                  className={`fac-att-card fac-att-card-${status.toLowerCase() || 'unmarked'}`}
                  onClick={() => toggle(s.studentId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggle(s.studentId)}
                  aria-label={`${s.name}: ${status || 'Not marked'}. Click to toggle.`}
                >
                  <div className="fac-att-card-avatar">{s.name.charAt(0)}</div>
                  <div className="fac-att-card-info">
                    <strong>{s.name}</strong>
                    <small>{s.enrollmentNo}</small>
                  </div>
                  <div className="fac-att-toggle-area">
                    <label
                      className={`fac-att-chip fac-att-chip-present ${status === 'Present' ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setStatuses((p) => ({ ...p, [s.studentId]: 'Present' })); setMessage(''); }}
                    >P</label>
                    <label
                      className={`fac-att-chip fac-att-chip-absent ${status === 'Absent' ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setStatuses((p) => ({ ...p, [s.studentId]: 'Absent' })); setMessage(''); }}
                    >A</label>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {students.length > 0 && (
          <div className="fac-att-save-row">
            <button
              type="button"
              className="btn"
              onClick={saveAttendance}
              disabled={saving || markedCount < students.length}
              style={{ minWidth: 160 }}
            >
              {saving ? 'Saving…' : `💾 Save Attendance`}
            </button>
            {markedCount < students.length && (
              <span className="fac-att-pending-warn">
                {students.length - markedCount} student{students.length - markedCount !== 1 ? 's' : ''} not yet marked
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
