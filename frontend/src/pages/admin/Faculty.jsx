import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../api/client';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

const EMPTY = { name: '', email: '', department: '', password: '' };

function Faculty() {
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
      const data = await apiRequest('/faculty');
      setFaculty(data.faculty);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY); setFormError(''); setEditing('new'); };
  const openEdit = (f) => { setForm({ ...f, password: '' }); setFormError(''); setEditing(f); };
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim() || !form.department.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (editing === 'new' && !form.password) {
      setFormError('Please set a password for the new faculty member.');
      return;
    }

    setSaving(true);
    try {
      if (editing === 'new') {
        await apiRequest('/faculty', { method: 'POST', body: form });
        setMessage({ type: 'success', text: 'Faculty member added.' });
      } else {
        await apiRequest(`/faculty/${editing.id}`, { method: 'PUT', body: form });
        setMessage({ type: 'success', text: 'Faculty member updated.' });
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
      await apiRequest(`/faculty/${toDelete.id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Faculty member deleted. Their courses are now unassigned.' });
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
    { key: 'name', label: 'Name', sortable: true },
    { key: 'department', label: 'Department', sortable: true },
    { key: 'email', label: 'Email' },
    {
      key: 'actions',
      label: 'Actions',
      render: (f) => (
        <div className="row-actions">
          <button className="btn btn-secondary btn-small" onClick={() => openEdit(f)}>Edit</button>
          <button className="btn btn-danger btn-small" onClick={() => setToDelete(f)}>Delete</button>
        </div>
      ),
    },
  ];

  if (loading) return <Loader />;

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1>Faculty</h1>
          <p>Manage faculty accounts. Faculty cannot register themselves.</p>
        </div>
        <button className="btn" onClick={openNew}>+ Add Faculty</button>
      </div>

      <Alert type={message.type || 'info'}>{message.text}</Alert>

      <div className="panel">
        <DataTable
          columns={columns}
          rows={faculty}
          searchKeys={['name', 'email', 'department']}
          emptyTitle="No faculty yet"
          emptyMessage="Click 'Add Faculty' to create the first account."
        />
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add Faculty' : 'Edit Faculty'} onClose={() => setEditing(null)}>
          <Alert type="error">{formError}</Alert>
          <form onSubmit={save} noValidate>
            <div className="form-group">
              <label>Full name *</label>
              <input className="form-control" value={form.name} onChange={update('name')} />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" className="form-control" value={form.email} onChange={update('email')} />
            </div>
            <div className="form-group">
              <label>Department *</label>
              <input className="form-control" value={form.department} onChange={update('department')} />
            </div>
            <div className="form-group">
              <label>{editing === 'new' ? 'Password *' : 'New password (leave empty to keep current)'}</label>
              <input type="password" className="form-control" value={form.password} onChange={update('password')} autoComplete="new-password" />
              <small>At least 8 characters, with a letter and a number.</small>
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
          message={`Delete ${toDelete.name}? Their login will be removed and their courses will become unassigned.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}

export default Faculty;