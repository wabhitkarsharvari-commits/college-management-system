import { useEffect, useState } from 'react';
import { apiRequest } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

export default function StudentAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/students/attendance')
      .then((data) => {
        setAttendance(Array.isArray(data.attendance) ? data.attendance : []);
        setSummary(data.summary || null);
      })
      .catch((err) => setError(err.message || 'Could not load attendance.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const pct = summary?.percentage ?? null;
  const isLow = pct !== null && pct < 75;

  // Group by course for per-course summary
  const byCourse = {};
  attendance.forEach((rec) => {
    const key = rec.courseName || rec.courseId || 'Unknown';
    if (!byCourse[key]) byCourse[key] = { present: 0, absent: 0, name: key };
    if (rec.status === 'Present') byCourse[key].present++;
    if (rec.status === 'Absent') byCourse[key].absent++;
  });
  const courseRows = Object.values(byCourse);

  return (
    <>
      <div className="page-header">
        <h1>My Attendance</h1>
        <p>Your daily attendance log across all subjects.</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {isLow && (
        <Alert type="warning">
          Your overall attendance ({pct}%) is below the 75% requirement. Please
          attend classes regularly.
        </Alert>
      )}

      {/* Summary cards */}
      <div className="card-grid">
        <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="stat-title">Present</div>
          <div className="stat-value">{summary?.present ?? 0}</div>
          <div className="stat-hint">Classes attended</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#ef4444' }}>
          <div className="stat-title">Absent</div>
          <div className="stat-value">{summary?.absent ?? 0}</div>
          <div className="stat-hint">Classes missed</div>
        </div>
        <div
          className="stat-card"
          style={{ borderLeftColor: isLow ? '#ef4444' : '#3b82f6' }}
        >
          <div className="stat-title">Overall</div>
          <div className="stat-value">{pct !== null ? `${pct}%` : '—'}</div>
          <div className="stat-hint">
            {summary?.total ?? 0} total recorded classes
          </div>
        </div>
      </div>

      {/* Per-course breakdown */}
      {courseRows.length > 0 && (
        <div className="panel">
          <h2>Per-Subject Attendance</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="dt-table">
              <thead>
                <tr>
                  <th className="dt-th">Subject</th>
                  <th className="dt-th">Present</th>
                  <th className="dt-th">Absent</th>
                  <th className="dt-th">Total</th>
                  <th className="dt-th">Percentage</th>
                  <th className="dt-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {courseRows.map((row, i) => {
                  const total = row.present + row.absent;
                  const cp = total ? ((row.present / total) * 100).toFixed(1) : null;
                  const low = cp !== null && Number(cp) < 75;
                  return (
                    <tr key={i} className="dt-row">
                      <td className="dt-td"><strong>{row.name}</strong></td>
                      <td className="dt-td">{row.present}</td>
                      <td className="dt-td">{row.absent}</td>
                      <td className="dt-td">{total}</td>
                      <td className="dt-td">{cp !== null ? `${cp}%` : '—'}</td>
                      <td className="dt-td">
                        <span className={`att-badge att-${low ? 'absent' : 'present'}`}>
                          {low ? 'Low' : 'Good'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full log */}
      <div className="panel">
        <h2>Full Attendance Log</h2>
        {attendance.length === 0 ? (
          <p>No attendance records have been recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt-table">
              <thead>
                <tr>
                  <th className="dt-th">Date</th>
                  <th className="dt-th">Subject</th>
                  <th className="dt-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((rec, i) => (
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
        )}
      </div>
    </>
  );
}
