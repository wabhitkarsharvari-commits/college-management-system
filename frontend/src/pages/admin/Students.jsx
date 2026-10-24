import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../api/client';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

const BRANCHES = ['Information Technology', 'Computer Science', 'Electronics', 'Mechanical', 'Civil'];
const BRANCH_COLORS = {
  'Information Technology': '#3b82f6',
  'Computer Science':       '#8b5cf6',
  'Electronics':            '#f59e0b',
  'Mechanical':             '#10b981',
  'Civil':                  '#ef4444',
};

const EMPTY = {
  name: '', enrollmentNo: '', branch: '', semester: '',
  email: '', cgpa: '', academicPercentage: '', password: '',
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [message, setMessage]   = useState({ type: '', text: '' });
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving]     = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest('/students');
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setForm(EMPTY); setFormError(''); setEditing('new'); };
  const openEdit = (s) => { setForm({ ...s, password: '' }); setFormError(''); setEditing(s); };
  const set      = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    if (['name', 'enrollmentNo', 'branch', 'semester', 'email'].some((f) => !String(form[f]).trim())) {
      setFormError('Please fill in all required fields.'); return;
    }
    if (editing === 'new' && !form.password) {
      setFormError('Please set a password.'); return;
    }
    setSaving(true);
    try {
      const body = { ...form, semester: Number(form.semester) };
      if (editing === 'new') {
        await apiRequest('/students', { method: 'POST', body });
        setMessage({ type: 'success', text: 'Student added successfully.' });
      } else {
        await apiRequest(`/students/${editing.id}`, { method: 'PUT', body });
        setMessage({ type: 'success', text: 'Student updated.' });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await apiRequest(`/students/${toDelete.id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: `${toDelete.name} deleted.` });
      setToDelete(null);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // Branch stats
  const branchCounts = BRANCHES.reduce((acc, b) => {
    acc[b] = students.filter((s) => s.branch === b).length;
    return acc;
  }, {});
  const avgCgpa = students.length
    ? (students.reduce((s, st) => s + (Number(st.cgpa) || 0), 0) / students.length).toFixed(2)
    : '—';

  const columns = [
    {
      key: 'name', label: 'Student', sortable: true,
      render: (s) => (
        <div className="adm-stu-cell">
          <div className="adm-stu-avatar"
            style={{ background: BRANCH_COLORS[s.branch] || '#64748b' }}>
            {s.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'enrollmentNo', label: 'Enrollment No', sortable: true },
    {
      key: 'branch', label: 'Branch', sortable: true,
      render: (s) => (
        <span className="adm-branch-chip"
          style={{ background: `${BRANCH_COLORS[s.branch] || '#64748b'}18`,
                   color: BRANCH_COLORS[s.branch] || '#64748b' }}>
          {s.branch.replace('Information Technology', 'IT').replace('Computer Science', 'CS')}
        </span>
      ),
    },
    { key: 'semester', label: 'Sem', sortable: true, render: (s) => `Sem ${s.semester}` },
    {
      key: 'cgpa', label: 'CGPA', sortable: true,
      render: (s) => (
        <span style={{ fontWeight: 700, color: Number(s.cgpa) >= 7 ? '#166534' : Number(s.cgpa) >= 5 ? '#92400e' : '#991b1b' }}>
          {s.cgpa ?? '—'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (s) => (
        <div className="row-actions">
          <button className="btn btn-secondary btn-small" onClick={() => openEdit(s)}>Edit</button>
          <button className="btn btn-danger btn-small" onClick={() => setToDelete(s)}>Delete</button>
        </div>
      ),
    },
  ];

  if (loading) return <Loader />;

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1>Students</h1>
          <p>Manage student accounts, profiles and academic records.</p>
        </div>
        <button className="btn" onClick={openNew}>+ Add Student</button>
      </div>

      {message.text && <Alert type={message.type || 'info'}>{message.text}</Alert>}

      {/* Stats strip */}
      <div className="card-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="stat-title">Total Students</div>
          <div className="stat-value">{students.length}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="stat-title">Avg CGPA</div>
          <div className="stat-value">{avgCgpa}</div>
        </div>
        {Object.entries(branchCounts).filter(([,v]) => v > 0).map(([b, n]) => (
          <div key={b} className="stat-card" style={{ borderLeftColor: BRANCH_COLORS[b] || '#64748b' }}>
            <div className="stat-title">{b.replace('Information Technology','IT').replace('Computer Science','CS')}</div>
            <div className="stat-value">{n}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          rows={students}
          searchKeys={['name', 'enrollmentNo', 'email']}
          filter={{ key: 'branch', label: 'All branches', options: BRANCHES }}
          emptyTitle="No students yet"
          emptyMessage="Click '+ Add Student' to create the first record."
        />
      </div>

      {editing && (
        <Modal title={editing === 'new' ? '+ Add Student' : 'Edit Student'} onClose={() => setEditing(null)}>
          <Alert type="error">{formError}</Alert>
          <form onSubmit={save} noValidate>
            <div className="form-grid">
              <div className="form-group rb-full-span">
                <label>Full name *</label>
                <input className="form-control" value={form.name} onChange={set('name')} placeholder="e.g. Riya Sharma" />
              </div>
              <div className="form-group">
                <label>Enrollment number *</label>
                <input className="form-control" value={form.enrollmentNo} onChange={set('enrollmentNo')} placeholder="e.g. IT2022001" />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" className="form-control" value={form.email} onChange={set('email')} />
              </div>
              <div className="form-group">
                <label>Branch *</label>
                <select className="form-control" value={form.branch} onChange={set('branch')}>
                  <option value="">Select branch</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Semester *</label>
                <select className="form-control" value={form.semester} onChange={set('semester')}>
                  <option value="">Select semester</option>
                  {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>CGPA (0–10)</label>
                <input type="number" step="0.01" min="0" max="10" className="form-control" value={form.cgpa} onChange={set('cgpa')} />
              </div>
              <div className="form-group">
                <label>Academic % (0–100)</label>
                <input type="number" step="0.01" min="0" max="100" className="form-control" value={form.academicPercentage} onChange={set('academicPercentage')} />
              </div>
              <div className="form-group rb-full-span">
                <label>{editing === 'new' ? 'Password *' : 'New password (leave blank to keep current)'}</label>
                <input type="password" className="form-control" value={form.password} onChange={set('password')} autoComplete="new-password" />
                <small>Min 8 chars, must include a letter and a number.</small>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save Student'}</button>
            </div>
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete Student"
          message={`Delete ${toDelete.name} (${toDelete.enrollmentNo})? Their login, attendance, marks, applications and resume will also be removed. This cannot be undone.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
