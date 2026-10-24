import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

// ─── helpers ────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  icon: '🕐', cls: 'app-status-pending',  barCls: 'step-active',  step: 1 },
  reviewed: { label: 'Reviewed', icon: '👀', cls: 'app-status-reviewed', barCls: 'step-active',  step: 2 },
  selected: { label: 'Selected', icon: '🎉', cls: 'app-status-selected', barCls: 'step-done',    step: 3 },
  hired:    { label: 'Hired',    icon: '🏆', cls: 'app-status-selected', barCls: 'step-done',    step: 3 },
  rejected: { label: 'Rejected', icon: '✗',  cls: 'app-status-rejected', barCls: 'step-failed',  step: -1 },
};

// ─── Application progress bar ─────────────────────────────────
function StatusBar({ status }) {
  const STEPS = ['Applied', 'Reviewed', 'Decision'];
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  if (cfg.step === -1) {
    return (
      <div className="app-status-bar">
        {STEPS.map((s, i) => (
          <div key={i} className="app-step">
            <div className="app-step-dot step-failed" />
            <span className="app-step-label">{s}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="app-status-bar">
      {STEPS.map((s, i) => {
        const stepNum = i + 1;
        const done    = stepNum < cfg.step;
        const current = stepNum === cfg.step;
        return (
          <div key={i} className="app-step">
            {i > 0 && (
              <div className={`app-step-line ${done || current ? 'app-step-line-fill' : ''}`} />
            )}
            <div
              className={`app-step-dot ${done ? 'step-done' : current ? 'step-active' : ''}`}
            >
              {done ? '✓' : stepNum}
            </div>
            <span className={`app-step-label ${current ? 'app-step-label-bold' : ''}`}>
              {s}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Application Card ─────────────────────────────────────────
function ApplicationCard({ app }) {
  const [expanded, setExpanded] = useState(false);
  const cfg      = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
  const drive    = app.drive || {};
  const days     = drive.deadline ? daysUntil(drive.deadline) : null;

  return (
    <div className={`app-card app-card-${app.status || 'pending'}`}>
      {/* Card header */}
      <div className="app-card-header">
        <div className="app-card-logo">
          {(drive.company || '?').charAt(0).toUpperCase()}
        </div>
        <div className="app-card-title">
          <h3 className="app-card-company">{drive.company || '—'}</h3>
          <p className="app-card-role">{drive.role || '—'}</p>
        </div>
        <div className="app-card-status-col">
          <span className={`app-status-chip ${cfg.cls}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div className="app-card-meta">
        {drive.location  && <span>📍 {drive.location}</span>}
        <span>📤 Applied {formatDate(app.appliedAt)}</span>
        {drive.deadline  && (
          <span>
            📅 Deadline {formatDate(drive.deadline)}
            {days !== null && days >= 0 && (
              <span className="app-deadline-note"> ({days}d left)</span>
            )}
          </span>
        )}
        {drive.minCgpa > 0 && <span>🎓 Min CGPA {drive.minCgpa}</span>}
      </div>

      {/* Status progress bar */}
      <StatusBar status={app.status} />

      {/* Expand toggle for description */}
      {drive.description && (
        <>
          <button
            type="button"
            className="app-expand-btn"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '▲ Hide details' : '▼ Show job details'}
          </button>
          {expanded && (
            <div className="app-desc-box">
              <p>{drive.description}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [drives, setDrives]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState('');
  const [filter, setFilter]             = useState('all');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    const [appsRes, drivesRes] = await Promise.allSettled([
      apiRequest('/students/applications'),
      apiRequest('/students/placements'),
    ]);

    if (appsRes.status === 'fulfilled') {
      setApplications(
        Array.isArray(appsRes.value?.applications) ? appsRes.value.applications : []
      );
    } else {
      setError(appsRes.reason?.message || 'Could not load applications.');
    }
    if (drivesRes.status === 'fulfilled') {
      setDrives(
        Array.isArray(drivesRes.value?.drives) ? drivesRes.value.drives : []
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader />;

  // Enrich with drive data
  const enriched = applications.map((app) => ({
    ...app,
    drive: drives.find((d) => d.id === app.driveId) || {},
  }));

  const byStatus = {
    all:      enriched,
    pending:  enriched.filter((a) => !a.status || a.status === 'pending'),
    reviewed: enriched.filter((a) => a.status === 'reviewed'),
    selected: enriched.filter((a) => a.status === 'selected' || a.status === 'hired'),
    rejected: enriched.filter((a) => a.status === 'rejected'),
  };

  const visible = byStatus[filter] || enriched;

  return (
    <>
      {/* Page header */}
      <div className="page-header pd-page-header">
        <div>
          <h1>My Applications</h1>
          <p>Track the status of every placement drive application you have submitted.</p>
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

      {/* Summary stat cards */}
      <div className="card-grid">
        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="stat-title">Total</div>
          <div className="stat-value">{enriched.length}</div>
          <div className="stat-hint">Applications submitted</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-title">Pending</div>
          <div className="stat-value">{byStatus.pending.length}</div>
          <div className="stat-hint">Awaiting review</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#06b6d4' }}>
          <div className="stat-title">Under Review</div>
          <div className="stat-value">{byStatus.reviewed.length}</div>
          <div className="stat-hint">Recruiter reviewing</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="stat-title">Selected / Hired</div>
          <div className="stat-value">{byStatus.selected.length}</div>
          <div className="stat-hint">
            {byStatus.selected.length > 0 ? '🎉 Congratulations!' : 'Keep applying!'}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="pd-filter-bar">
        {[
          { key: 'all',      label: `All (${enriched.length})` },
          { key: 'pending',  label: `Pending (${byStatus.pending.length})` },
          { key: 'reviewed', label: `Reviewed (${byStatus.reviewed.length})` },
          { key: 'selected', label: `Selected (${byStatus.selected.length})` },
          { key: 'rejected', label: `Rejected (${byStatus.rejected.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`pd-filter-tab ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Application cards */}
      {visible.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <h3>
              {filter === 'all'
                ? 'No applications yet'
                : `No ${filter} applications`}
            </h3>
            <p>
              {filter === 'all' ? (
                <>
                  Head to{' '}
                  <Link to="/student/placements">Placement Drives</Link>
                  {' '}to find and apply for opportunities.
                </>
              ) : (
                'Nothing in this category right now.'
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="app-cards-list">
          {visible.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}

      {/* Bottom hint */}
      {enriched.length > 0 && (
        <div className="panel app-tip-panel">
          <p className="app-tip">
            💡 <strong>Tip:</strong> Application statuses are updated by the placement coordinator.
            Check back regularly for updates. You can also{' '}
            <Link to="/student/placements">explore more drives</Link>.
          </p>
        </div>
      )}
    </>
  );
}
