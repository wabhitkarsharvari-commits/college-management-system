import { useEffect, useState } from 'react';
import { apiRequest } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

function getGrade(pct) {
  if (pct >= 90) return { g: 'O',  cls: 'grade-good' };
  if (pct >= 80) return { g: 'A+', cls: 'grade-good' };
  if (pct >= 70) return { g: 'A',  cls: 'grade-good' };
  if (pct >= 60) return { g: 'B+', cls: 'grade-good' };
  if (pct >= 50) return { g: 'B',  cls: 'grade-good' };
  if (pct >= 40) return { g: 'C',  cls: 'grade-good' };
  return               { g: 'F',  cls: 'grade-low'  };
}

export default function Marks() {
  const [courses, setCourses]   = useState([]);
  const [courseId, setCourseId] = useState('');
  const [students, setStudents] = useState([]);
  const [maxMarks, setMaxMarks] = useState('100');
  const [marks, setMarks]       = useState({});
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [loadingMrk, setLoadingMrk] = useState(false);
  const [saving, setSaving]     = useState(false);

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

  useEffect(() => {
    if (!courseId) { setStudents([]); setMarks({}); return; }
    let active = true;
    setLoadingMrk(true);
    setError(''); setMessage('');

    apiRequest(`/marks/course/${courseId}`)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.marks) ? data.marks : [];
        setStudents(list);
        const existing = {};
        list.forEach((s) => {
          if (s.marks !== '' && s.marks !== undefined) {
            existing[s.studentId || s.id] = String(s.marks);
          }
        });
        setMarks(existing);
        // Auto-detect maxMarks from existing data
        const firstWithMax = list.find((s) => s.maxMarks);
        if (firstWithMax) setMaxMarks(String(firstWithMax.maxMarks));
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoadingMrk(false); });

    return () => { active = false; };
  }, [courseId]);

  function updateMark(id, val) {
    setMarks((p) => ({ ...p, [id]: val }));
    setMessage('');
  }

  async function saveMarks(e) {
    e.preventDefault();
    setError(''); setMessage('');
    const max = Number(maxMarks);
    if (!Number.isFinite(max) || max <= 0) { setError('Enter a valid maximum marks value.'); return; }
    if (!students.length) { setError('No students found for this course.'); return; }

    const records = [];
    for (const s of students) {
      const id  = s.studentId || s.id;
      const val = marks[id];
      if (val === undefined || val === '') { setError(`Enter marks for ${s.name || 'all students'}.`); return; }
      const score = Number(val);
      if (!Number.isFinite(score) || score < 0 || score > max) {
        setError(`Marks must be between 0 and ${max}.`); return;
      }
      records.push({ studentId: id, marks: score, maxMarks: max });
    }

    setSaving(true);
    try {
      await apiRequest('/marks', { method: 'POST', body: { courseId, records } });
      setMessage('Marks saved successfully.');
      // refresh
      const refreshed = await apiRequest(`/marks/course/${courseId}`);
      const list = Array.isArray(refreshed?.marks) ? refreshed.marks : [];
      setStudents(list);
      const updated = {};
      list.forEach((s) => {
        if (s.marks !== '' && s.marks !== undefined) updated[s.studentId || s.id] = String(s.marks);
      });
      setMarks(updated);
    } catch (err) {
      setError(err.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;

  const max = Number(maxMarks);
  const selectedCourse = courses.find((c) => c.id === courseId);

  // Live class stats from current inputs
  const scores = students
    .map((s) => {
      const id  = s.studentId || s.id;
      const val = marks[id];
      if (val === undefined || val === '') return null;
      const n = Number(val);
      return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
    })
    .filter((v) => v !== null);

  const classAvg  = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const classHigh = scores.length > 0 ? Math.max(...scores) : null;
  const classLow  = scores.length > 0 ? Math.min(...scores) : null;
  const passing   = scores.filter((s) => (s / max) * 100 >= 40).length;

  return (
    <>
      <div className="page-header fac-page-header">
        <div>
          <h1>Marks &amp; Grades</h1>
          <p>Enter and save exam scores for your assigned courses.</p>
        </div>
      </div>

      {error   && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      {/* ── Selectors ── */}
      <div className="panel fac-marks-controls">
        <div className="fac-marks-selectors">
          <div className="form-group">
            <label htmlFor="marks-course">Course</label>
            <select
              id="marks-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="max-marks">Maximum Marks</label>
            <input
              id="max-marks"
              type="number"
              min="1"
              max="1000"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
            />
          </div>
        </div>
        {selectedCourse && (
          <div className="fac-att-course-info">
            <span className="course-code-badge">{selectedCourse.code}</span>
            <span>{selectedCourse.branch}</span>
            <span>Semester {selectedCourse.semester}</span>
          </div>
        )}
      </div>

      {/* ── Live class stats ── */}
      {scores.length > 0 && (
        <div className="card-grid fac-marks-stats">
          <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
            <div className="stat-title">Class Average</div>
            <div className="stat-value">{classAvg !== null ? classAvg.toFixed(1) : '—'}</div>
            <div className="stat-hint">
              {classAvg !== null
                ? (() => { const gl = getGrade((classAvg / max) * 100); return <span className={`performance-grade ${gl.cls}`} style={{fontSize:'0.75rem'}}>{gl.g}</span>; })()
                : ''}
            </div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
            <div className="stat-title">Highest</div>
            <div className="stat-value">{classHigh ?? '—'}</div>
            <div className="stat-hint">{classHigh !== null ? `${((classHigh / max) * 100).toFixed(0)}%` : ''}</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#ef4444' }}>
            <div className="stat-title">Lowest</div>
            <div className="stat-value">{classLow ?? '—'}</div>
            <div className="stat-hint">{classLow !== null ? `${((classLow / max) * 100).toFixed(0)}%` : ''}</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
            <div className="stat-title">Passing</div>
            <div className="stat-value">{passing} / {scores.length}</div>
            <div className="stat-hint">≥ 40% threshold</div>
          </div>
        </div>
      )}

      {/* ── Marks entry table ── */}
      <div className="panel">
        <h2>Marks Entry</h2>

        {loadingMrk ? (
          <Loader />
        ) : students.length === 0 ? (
          <div className="empty-state">
            <h3>No students found</h3>
            <p>No students match the branch and semester for this course.</p>
          </div>
        ) : (
          <form onSubmit={saveMarks}>
            <div style={{ overflowX: 'auto' }}>
              <table className="dt-table fac-marks-table">
                <thead>
                  <tr>
                    <th className="dt-th">Student</th>
                    <th className="dt-th">Enrollment</th>
                    <th className="dt-th" style={{ width: 130 }}>Marks / {max}</th>
                    <th className="dt-th">Percentage</th>
                    <th className="dt-th">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const id    = s.studentId || s.id;
                    const val   = marks[id];
                    const score = val !== undefined && val !== '' ? Number(val) : null;
                    const valid = score !== null && Number.isFinite(score) && score >= 0 && score <= max;
                    const pct   = valid ? (score / max) * 100 : null;
                    const gl    = pct !== null ? getGrade(pct) : null;

                    return (
                      <tr key={id} className="dt-row">
                        <td className="dt-td">
                          <div className="fac-stu-name-cell">
                            <div className="fac-stu-mini-avatar">{s.name.charAt(0)}</div>
                            <strong>{s.name}</strong>
                          </div>
                        </td>
                        <td className="dt-td">{s.enrollmentNo || '—'}</td>
                        <td className="dt-td">
                          <div className="fac-marks-input-wrap">
                            <input
                              type="number"
                              min="0"
                              max={maxMarks}
                              step="0.5"
                              className="fac-marks-input"
                              value={val ?? ''}
                              placeholder="—"
                              aria-label={`Marks for ${s.name}`}
                              onChange={(e) => updateMark(id, e.target.value)}
                            />
                            {valid && (
                              <div
                                className="fac-marks-bar"
                                style={{
                                  width: `${pct}%`,
                                  background: pct >= 40 ? '#10b981' : '#ef4444',
                                }}
                              />
                            )}
                          </div>
                        </td>
                        <td className="dt-td">
                          {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                        </td>
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

            <div className="fac-marks-save-row">
              <button
                type="submit"
                className="btn"
                disabled={saving || !students.length}
                style={{ minWidth: 160 }}
              >
                {saving ? 'Saving…' : '💾 Save Marks'}
              </button>
              <span className="fac-att-pending-warn">
                {students.length - scores.length > 0
                  ? `${students.length - scores.length} student${students.length - scores.length !== 1 ? 's' : ''} not yet entered`
                  : ''}
              </span>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
