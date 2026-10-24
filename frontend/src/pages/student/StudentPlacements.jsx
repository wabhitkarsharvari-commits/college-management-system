import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

// ─── helpers ────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function deadlineBadge(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0)  return { label: 'Closed',           cls: 'dl-closed' };
  if (days === 0) return { label: 'Today!',           cls: 'dl-urgent' };
  if (days <= 3)  return { label: `${days}d left`,    cls: 'dl-urgent' };
  if (days <= 7)  return { label: `${days}d left`,    cls: 'dl-soon' };
  return           { label: `${days}d left`,          cls: 'dl-ok' };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Drive Detail Modal ──────────────────────────────────────────
function DriveModal({ drive, applied, applying, onApply, onClose, cgpa }) {
  if (!drive) return null;
  const dl = deadlineBadge(drive.deadline);
  const eligible = !drive.minCgpa || cgpa >= drive.minCgpa;

  return (
    <div className="pd-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="pd-modal-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pd-modal-title"
      >
        {/* header */}
        <div className="pd-modal-header">
          <div className="pd-modal-co-row">
            <div className="pd-modal-logo">
              {drive.company.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 id="pd-modal-title" className="pd-modal-company">{drive.company}</h2>
              <p className="pd-modal-role">{drive.role}</p>
            </div>
          </div>
          <button className="pd-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* meta pills */}
        <div className="pd-modal-pills">
          <span className="pd-pill pd-pill-loc">📍 {drive.location}</span>
          <span className="pd-pill pd-pill-date">📅 {formatDate(drive.deadline)}</span>
          {dl && <span className={`pd-pill pd-pill-dl ${dl.cls}`}>{dl.label}</span>}
          <span className="pd-pill pd-pill-cgpa">
            Min CGPA: {drive.minCgpa > 0 ? drive.minCgpa : 'None'}
          </span>
        </div>

        {/* description */}
        {drive.description && (
          <div className="pd-modal-desc">
            <h3>About the Role</h3>
            <p>{drive.description}</p>
          </div>
        )}

        {/* eligibility */}
        <div className={`pd-eligibility-box ${eligible ? 'eligible' : 'not-eligible'}`}>
          {eligible ? (
            <>
              <span className="pd-elig-icon">✅</span>
              <span>You are eligible — your CGPA ({cgpa}) meets the requirement.</span>
            </>
          ) : (
            <>
              <span className="pd-elig-icon">⚠️</span>
              <span>
                Your CGPA ({cgpa}) is below the required {drive.minCgpa}. You cannot apply.
              </span>
            </>
          )}
        </div>

        {/* action */}
        <div className="pd-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {eligible && (
            applied ? (
              <span className="pd-applied-chip">✓ Already Applied</span>
            ) : (
              <button
                className="btn pd-apply-btn"
                onClick={onApply}
                disabled={applying}
              >
                {applying ? 'Submitting…' : '🚀 Apply Now'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drive Card ──────────────────────────────────────────────────
function DriveCard({ drive, applied, applying, cgpa, onViewDetails, onQuickApply }) {
  const dl = deadlineBadge(drive.deadline);
  const eligible = !drive.minCgpa || cgpa >= drive.minCgpa;
  const expired = daysUntil(drive.deadline) < 0;

  return (
    <div className={`pd-card ${!eligible ? 'pd-card-ineligible' : ''} ${expired ? 'pd-card-expired' : ''}`}>
      {/* top row */}
      <div className="pd-card-top">
        <div className="pd-card-logo">
          {drive.company.charAt(0).toUpperCase()}
        </div>
        <div className="pd-card-title-group">
          <h3 className="pd-card-company">{drive.company}</h3>
          <p className="pd-card-role">{drive.role}</p>
        </div>
        {applied && <span className="pd-applied-chip pd-applied-chip-top">✓ Applied</span>}
      </div>

      {/* meta */}
      <div className="pd-card-meta">
        <span>📍 {drive.location}</span>
        <span>📅 {formatDate(drive.deadline)}</span>
        {drive.minCgpa > 0 && (
          <span>🎓 Min {drive.minCgpa} CGPA</span>
        )}
      </div>

      {/* deadline bar */}
      {dl && (
        <div className={`pd-deadline-strip ${dl.cls}`}>
          ⏰ {dl.label}
        </div>
      )}

      {/* description snippet */}
      {drive.description && (
        <p className="pd-card-desc">
          {drive.description.length > 110
            ? drive.description.slice(0, 110) + '…'
            : drive.description}
        </p>
      )}

      {/* eligibility note */}
      {!eligible && (
        <div className="pd-ineligible-note">
          ⚠ Your CGPA ({cgpa}) is below the {drive.minCgpa} required.
        </div>
      )}

      {/* actions */}
      <div className="pd-card-actions">
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => onViewDetails(drive)}
        >
          View Details
        </button>

        {eligible && !expired && (
          applied ? (
            <span className="pd-applied-chip">✓ Applied</span>
          ) : (
            <button
              type="button"
              className="btn btn-small pd-apply-btn"
              disabled={applying === drive.id}
              onClick={() => onQuickApply(drive.id)}
            >
              {applying === drive.id ? 'Applying…' : 'Apply'}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function StudentPlacements() {
  const [drives, setDrives]           = useState([]);
  const [profile, setProfile]         = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [applying, setApplying]       = useState('');
  const [error, setError]             = useState('');
  const [message, setMessage]         = useState('');
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [filter, setFilter]           = useState('all'); // 'all' | 'eligible' | 'applied'

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    const [drivesRes, profileRes, appsRes] = await Promise.allSettled([
      apiRequest('/students/placements'),
      apiRequest('/students/me'),
      apiRequest('/students/applications'),
    ]);

    if (drivesRes.status === 'fulfilled') {
      setDrives(
        Array.isArray(drivesRes.value?.drives) ? drivesRes.value.drives : []
      );
    } else {
      setError(drivesRes.reason?.message || 'Could not load placement drives.');
    }
    if (profileRes.status === 'fulfilled') {
      setProfile(profileRes.value?.student || null);
    }
    if (appsRes.status === 'fulfilled') {
      setApplications(
        Array.isArray(appsRes.value?.applications) ? appsRes.value.applications : []
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function applyToDrive(driveId) {
    setError('');
    setMessage('');
    setApplying(driveId);
    try {
      await apiRequest('/students/applications', { method: 'POST', body: { driveId } });
      const data = await apiRequest('/students/applications');
      setApplications(Array.isArray(data?.applications) ? data.applications : []);
      setMessage('Application submitted! You can track it in My Applications.');
      // also close modal if open
      if (selectedDrive?.id === driveId) setSelectedDrive(null);
    } catch (err) {
      setError(err.message || 'Could not submit application.');
    } finally {
      setApplying('');
    }
  }

  if (loading) return <Loader />;

  const cgpa = profile?.cgpa ?? 0;
  const appliedIds = new Set(applications.map((a) => a.driveId));

  const eligibleDrives  = drives.filter((d) => !d.minCgpa || cgpa >= d.minCgpa);
  const appliedDrives   = drives.filter((d) => appliedIds.has(d.id));
  const upcomingDrives  = drives.filter((d) => daysUntil(d.deadline) >= 0);

  const visibleDrives =
    filter === 'eligible' ? eligibleDrives :
    filter === 'applied'  ? appliedDrives  :
    drives;

  return (
    <>
      {/* Page header */}
      <div className="page-header pd-page-header">
        <div>
          <h1>Placement Drives</h1>
          <p>Browse active opportunities and apply to drives you're eligible for.</p>
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

      {error   && <Alert type="error">{error}</Alert>}
      {message && (
        <Alert type="success">
          {message}{' '}
          <Link to="/student/applications" style={{ fontWeight: 700 }}>
            View Applications →
          </Link>
        </Alert>
      )}

      {/* Summary stats */}
      <div className="card-grid">
        <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="stat-title">Active Drives</div>
          <div className="stat-value">{drives.length}</div>
          <div className="stat-hint">{upcomingDrives.length} still open</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="stat-title">Eligible For</div>
          <div className="stat-value">{eligibleDrives.length}</div>
          <div className="stat-hint">Based on your CGPA of {cgpa}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="stat-title">Applied</div>
          <div className="stat-value">{appliedDrives.length}</div>
          <div className="stat-hint">
            <Link to="/student/applications">View all →</Link>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-title">Your CGPA</div>
          <div className="stat-value">{cgpa}</div>
          <div className="stat-hint">{profile?.branch || '—'}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="pd-filter-bar">
        {[
          { key: 'all',      label: `All Drives (${drives.length})` },
          { key: 'eligible', label: `Eligible (${eligibleDrives.length})` },
          { key: 'applied',  label: `Applied (${appliedDrives.length})` },
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

      {/* Drive cards grid */}
      {visibleDrives.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <h3>
              {filter === 'applied'  ? 'No applications yet' :
               filter === 'eligible' ? 'No eligible drives right now' :
               'No placement drives available'}
            </h3>
            <p>
              {filter === 'applied'
                ? 'Apply to drives above to see them here.'
                : 'Check back later — new opportunities are added regularly.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="pd-cards-grid">
          {visibleDrives.map((drive) => (
            <DriveCard
              key={drive.id}
              drive={drive}
              applied={appliedIds.has(drive.id)}
              applying={applying}
              cgpa={cgpa}
              onViewDetails={setSelectedDrive}
              onQuickApply={applyToDrive}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedDrive && (
        <DriveModal
          drive={selectedDrive}
          applied={appliedIds.has(selectedDrive.id)}
          applying={applying === selectedDrive.id}
          cgpa={cgpa}
          onApply={() => applyToDrive(selectedDrive.id)}
          onClose={() => setSelectedDrive(null)}
        />
      )}
    </>
  );
}
