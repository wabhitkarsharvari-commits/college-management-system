import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const STATUS_CFG = {
  pending:  { label: 'Pending',  cls: 'app-status-pending'  },
  reviewed: { label: 'Reviewed', cls: 'app-status-reviewed' },
  selected: { label: 'Selected', cls: 'app-status-selected' },
  hired:    { label: 'Hired',    cls: 'app-status-selected' },
  rejected: { label: 'Rejected', cls: 'app-status-rejected' },
};

const BRANCH_COLORS = {
  'Information Technology': '#3b82f6',
  'Computer Science':       '#8b5cf6',
  'Electronics':            '#f59e0b',
  'Mechanical':             '#10b981',
  'Civil':                  '#ef4444',
};

function MetricCard({ icon, label, value, sub, accent, to }) {
  const inner = (
    <div className="adm-metric-card" style={{ borderTopColor: accent }}>
      <div className="adm-metric-icon" style={{ background: `${accent}18`, color: accent }}>
        {icon}
      </div>
      <div className="adm-metric-body">
        <div className="adm-metric-value">{value}</div>
        <div className="adm-metric-label">{label}</div>
        {sub && <div className="adm-metric-sub">{sub}</div>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="adm-metric-link">{inner}</Link> : inner;
}

function BranchBar({ name, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = BRANCH_COLORS[name] || '#64748b';
  const short = name.replace('Information Technology', 'IT').replace('Computer Science', 'CS');
  return (
    <div className="adm-branch-row">
      <div className="adm-branch-name">{short}</div>
      <div className="adm-branch-bar-wrap">
        <div className="adm-branch-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="adm-branch-count">{count} ({pct}%)</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/admin/stats');
      setStats(data);
    } catch (err) {
      setError(err.message || 'Could not load dashboard statistics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      {/* ── Hero ── */}
      <div className="adm-hero">
        <div className="adm-hero-left">
          <div className="adm-hero-avatar">{(user?.name || 'A').charAt(0)}</div>
          <div>
            <p className="adm-hero-greeting">{greeting},</p>
            <h1 className="adm-hero-name">{user?.name ?? 'Admin'}</h1>
            <p className="adm-hero-date">📅 {today}</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {loading && <Loader />}

      {!loading && stats && (
        <>
          {/* ── KPI metrics ── */}
          <div className="adm-metrics-grid">
            <MetricCard icon="👩‍🎓" label="Students" value={stats.students}
              sub="Registered accounts" accent="#3b82f6" to="/admin/students" />
            <MetricCard icon="👨‍🏫" label="Faculty" value={stats.faculty}
              sub="Active members" accent="#8b5cf6" to="/admin/faculty" />
            <MetricCard icon="📚" label="Courses" value={stats.courses}
              sub="Across all branches" accent="#06b6d4" to="/admin/courses" />
            <MetricCard icon="✅" label="Attendance"
              value={stats.attendancePercentage !== null ? `${stats.attendancePercentage}%` : '—'}
              sub="Overall present rate" accent="#f59e0b" />
            <MetricCard icon="🏢" label="Active Drives" value={stats.activeDrives}
              sub={`${stats.totalDrives} total drives`} accent="#10b981" to="/admin/drives" />
            <MetricCard icon="📋" label="Applications" value={stats.applications}
              sub="Total submitted" accent="#f97316" to="/admin/applications" />
            <MetricCard icon="🏆" label="Selected" value={stats.studentsSelected}
              sub="Placed students" accent="#ec4899" />
          </div>

          {/* ── Quick actions ── */}
          <div className="adm-section-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="adm-actions-grid">
            {[
              { to: '/admin/students',    icon: '👩‍🎓', label: 'Students',        sub: 'Add, edit, remove' },
              { to: '/admin/faculty',     icon: '👨‍🏫', label: 'Faculty',         sub: 'Manage accounts' },
              { to: '/admin/courses',     icon: '📚', label: 'Courses',          sub: 'Assign faculty' },
              { to: '/admin/drives',      icon: '🏢', label: 'Placement Drives', sub: 'Post opportunities' },
              { to: '/admin/applications',icon: '📋', label: 'Applications',     sub: 'Review submissions' },
              { to: '/admin/reports',     icon: '📊', label: 'Reports',          sub: 'Analytics & insights' },
              { to: '/admin/settings',    icon: '⚙️', label: 'Settings',         sub: 'System configuration' },
            ].map(({ to, icon, label, sub }) => (
              <Link key={to} to={to} className="adm-action-tile">
                <span className="adm-action-icon">{icon}</span>
                <span className="adm-action-label">{label}</span>
                <span className="adm-action-sub">{sub}</span>
              </Link>
            ))}
          </div>

          {/* ── Two-column: branch breakdown + recent apps ── */}
          <div className="adm-bottom-grid">

            {/* Branch breakdown */}
            <div className="panel">
              <h2 className="adm-panel-title">Students by Branch</h2>
              {Object.keys(stats.branchBreakdown || {}).length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No students enrolled yet.</p>
              ) : (
                <div className="adm-branches">
                  {Object.entries(stats.branchBreakdown).map(([branch, count]) => (
                    <BranchBar key={branch} name={branch} count={count} total={stats.students} />
                  ))}
                </div>
              )}
            </div>

            {/* Recent applications */}
            <div className="panel">
              <div className="adm-panel-titlerow">
                <h2 className="adm-panel-title">Recent Applications</h2>
                <Link to="/admin/applications" className="adm-see-all">See all →</Link>
              </div>
              {!stats.recentApplications?.length ? (
                <p style={{ color: 'var(--text-muted)' }}>No applications yet.</p>
              ) : (
                <div className="adm-recent-apps">
                  {stats.recentApplications.map((app) => {
                    const cfg = STATUS_CFG[app.status] || STATUS_CFG.pending;
                    const dt = app.appliedAt
                      ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : '—';
                    return (
                      <div key={app.id} className="adm-app-row">
                        <div className="adm-app-avatar">
                          {(app.studentName || '?').charAt(0)}
                        </div>
                        <div className="adm-app-info">
                          <strong>{app.studentName}</strong>
                          <small>{app.company} — {app.role}</small>
                        </div>
                        <div className="adm-app-right">
                          <span className={`app-status-chip ${cfg.cls}`}>{cfg.label}</span>
                          <span className="adm-app-date">{dt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </>
  );
}
