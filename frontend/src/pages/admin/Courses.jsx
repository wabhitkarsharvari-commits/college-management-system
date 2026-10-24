import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../api/client';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

const BRANCHES = ['Information Technology', 'Computer Science', 'Electronics', 'Mechanical', 'Civil'];
const EMPTY = { code: '', name: '', branch: '', semester: '', credits: '', facultyId: '' };

function Courses() {
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, f] = await Promise.all([apiRequest('/courses'), apiRequest('/faculty')]);
      setCourses(c.courses.map((x) => ({ ...x, facultyName: x.facultyName || 'Unassigned' })));
      setFaculty(f.faculty);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY); setFormError(''); setEditing('new'); };
  const openEdit = (c) => { setForm({ ...c }); setFormError(''); setEditing(c); };
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    const required = ['code', 'name', 'branch', 'semester', 'credits'];
    if (required.some((f) => !String(form[f]).trim())) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        code: form.code,
        name: form.name,
        branch: form.branch,
        semester: Number(form.semester),
        credits: Number(form.credits),
        facultyId: form.facultyId,
      };
      if (editing === 'new') {
        await apiRequest('/courses', { method: 'POST', body });
        setMessage({ type: 'success', text: 'Course added.' });
      } else {
        await apiRequest(`/courses/${editing.id}`, { method: 'PUT', body });
        setMessage({ type: 'success', text: 'Course updated.' });
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
      await apiRequest(`/courses/${toDelete.id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Course deleted.' });
      setToDelete(null);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Course', sortable: true },
    { key: 'branch', label: 'Branch', sortable: true },
    { key: 'semester', label: 'Sem', sortable: true },
    { key: 'credits', label: 'Credits', sortable: true },
    { key: 'facultyName', label: 'Faculty', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: (c) => (
        <div className="row-actions">
          <button className="btn btn-secondary btn-small" onClick={() => openEdit(c)}>Edit</button>
          <button className="btn btn-danger btn-small" onClick={() => setToDelete(c)}>Delete</button>
        </div>
      ),
    },
  ];

  if (loading) return <Loader />;

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1>Courses</h1>
          <p>Manage subjects and assign them to faculty.</p>
        </div>
        <button className="btn" onClick={openNew}>+ Add Course</button>
      </div>

      <Alert type={message.type || 'info'}>{message.text}</Alert>

      <div className="panel">
        <DataTable
          columns={columns}
          rows={courses}
          searchKeys={['code', 'name', 'facultyName']}
          filter={{ key: 'branch', label: 'All branches', options: BRANCHES }}
          emptyTitle="No courses yet"
          emptyMessage="Click 'Add Course' to create the first one."
        />
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add Course' : 'Edit Course'} onClose={() => setEditing(null)}>
          <Alert type="error">{formError}</Alert>
          <form onSubmit={save} noValidate>
            <div className="form-group">
              <label>Course code *</label>
              <input className="form-control" value={form.code} onChange={update('code')} />
            </div>
            <div className="form-group">
              <label>Course name *</label>
              <input className="form-control" value={form.name} onChange={update('name')} />
            </div>
            <div className="form-group">
              <label>Branch *</label>
              <select className="form-control" value={form.branch} onChange={update('branch')}>
                <option value="">Select branch</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Semester *</label>
              <select className="form-control" value={form.semester} onChange={update('semester')}>
                <option value="">Select semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Credits *</label>
              <input type="number" min="1" max="10" className="form-control" value={form.credits} onChange={update('credits')} />
            </div>
            <div className="form-group">
              <label>Assigned faculty</label>
              <select className="form-control" value={form.facultyId} onChange={update('facultyId')}>
                <option value="">Unassigned</option>
                {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          message={`Delete course ${toDelete.code} - ${toDelete.name}? This cannot be undone.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}

export default Courses;