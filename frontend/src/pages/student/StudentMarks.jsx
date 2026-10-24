import { useEffect, useState } from 'react';
import { apiRequest } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

function gradeLabel(pct) {
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  return 'F';
}

export default function StudentMarks() {
  const [marks, setMarks]   = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    Promise.allSettled([
      apiRequest('/students/marks'),
      apiRequest('/students/me'),
    ]).then(([marksRes, profileRes]) => {
      if (marksRes.status === 'fulfilled') {
        setMarks(Array.isArray(marksRes.value?.marks) ? marksRes.value.marks : []);
      } else {
        setError(marksRes.reason?.message || 'Could not load marks.');
      }
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value?.student || null);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const recorded = marks.filter(
    (m) => m.marks !== '' && m.marks !== undefined
  );
  const obtained = recorded.reduce((t, m) => t + (Number(m.marks) || 0), 0);
  const maximum  = recorded.reduce((t, m) => t + (Number(m.maxMarks) || 0), 0);
  const overallPct = maximum > 0
    ? ((obtained / maximum) * 100).toFixed(1)
    : null;

  return (
    <>
      <div className="page-header">
        <h1>Marks &amp; Grades</h1>
        <p>Your exam scores across all subjects.</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Summary cards */}
      <div className="card-grid">
        <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="stat-title">CGPA</div>
          <div className="stat-value">{profile?.cgpa ?? '—'}</div>
          <div className="stat-hint">From your profile</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="stat-title">Overall Marks</div>
          <div className="stat-value">
            {overallPct !== null ? `${overallPct}%` : '—'}
          </div>
          <div className="stat-hint">
            {obtained} / {maximum} marks
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="stat-title">Subjects Recorded</div>
          <div className="stat-value">{recorded.length}</div>
          <div className="stat-hint">Out of {marks.length} enrolled subjects</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-title">Overall Grade</div>
          <div className="stat-value">
            {overallPct !== null ? gradeLabel(Number(overallPct)) : '—'}
          </div>
          <div className="stat-hint">Based on aggregated marks</div>
        </div>
      </div>

      {/* Marks table */}
      <div className="panel">
        <h2>Subject-wise Marks</h2>
        {recorded.length === 0 ? (
          <p>No marks have been recorded for you yet. Check back after your exams.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt-table">
              <thead>
                <tr>
                  <th className="dt-th">Subject</th>
                  <th className="dt-th">Marks Obtained</th>
                  <th className="dt-th">Max Marks</th>
                  <th className="dt-th">Percentage</th>
                  <th className="dt-th">Grade</th>
                </tr>
              </thead>
              <tbody>
                {recorded.map((rec, i) => {
                  const pct =
                    Number(rec.maxMarks) > 0
                      ? (Number(rec.marks) / Number(rec.maxMarks)) * 100
                      : null;
                  const grade = pct !== null ? gradeLabel(pct) : '—';
                  const isFail = grade === 'F';
                  return (
                    <tr key={i} className="dt-row">
                      <td className="dt-td"><strong>{rec.courseName || '—'}</strong></td>
                      <td className="dt-td">{rec.marks}</td>
                      <td className="dt-td">{rec.maxMarks}</td>
                      <td className="dt-td">
                        {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="dt-td">
                        <span
                          className={`performance-grade ${
                            isFail ? 'grade-low' : 'grade-good'
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
      </div>

      {/* Grading key */}
      <div className="panel">
        <h2>Grading Scale</h2>
        <div className="grade-scale-grid">
          {[
            { grade: 'O',  range: '≥ 90%', cls: 'grade-good' },
            { grade: 'A+', range: '≥ 80%', cls: 'grade-good' },
            { grade: 'A',  range: '≥ 70%', cls: 'grade-good' },
            { grade: 'B+', range: '≥ 60%', cls: 'grade-good' },
            { grade: 'B',  range: '≥ 50%', cls: 'grade-good' },
            { grade: 'C',  range: '≥ 40%', cls: 'grade-good' },
            { grade: 'F',  range: '< 40%', cls: 'grade-low' },
          ].map(({ grade, range, cls }) => (
            <div key={grade} className="grade-scale-item">
              <span className={`performance-grade ${cls}`}>{grade}</span>
              <small>{range}</small>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
