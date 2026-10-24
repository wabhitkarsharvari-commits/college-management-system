import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

const emptyForm = {
  company: '',
  role: '',
  location: '',
  deadline: '',
  minCgpa: '0',
  description: '',
  status: 'active',
};

export default function PlacementDrives() {
  const [drives, setDrives] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDrives = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/placements');
      setDrives(Array.isArray(data.drives) ? data.drives : []);
    } catch (err) {
      setError(err.message || 'Unable to load placement drives.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (
      !form.company.trim() ||
      !form.role.trim() ||
      !form.location.trim() ||
      !form.deadline
    ) {
      setError(
        'Please fill in company, role, location, and deadline.'
      );
      return;
    }

    const cgpa = Number(form.minCgpa);

    if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
      setError('Minimum CGPA must be between 0 and 10.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        company: form.company.trim(),
        role: form.role.trim(),
        location: form.location.trim(),
        minCgpa: cgpa,
      };

      let result;

      if (editingId) {
        result = await apiRequest(`/placements/${editingId}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
        result = await apiRequest('/placements', {
          method: 'POST',
          body: payload,
        });
      }

      if (editingId) {
        setDrives((current) =>
          current.map((drive) =>
            drive.id === editingId ? result.drive : drive
          )
        );
        setMessage('Placement drive updated successfully.');
      } else {
        setDrives((current) => [...current, result.drive]);
        setMessage('Placement drive added successfully.');
      }

      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      setError(err.message || 'Unable to save placement drive.');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(drive) {
    setEditingId(drive.id);

    setForm({
      company: drive.company || '',
      role: drive.role || '',
      location: drive.location || '',
      deadline: drive.deadline || '',
      minCgpa: String(drive.minCgpa ?? 0),
      description: drive.description || '',
      status: drive.status === 'closed' ? 'closed' : 'active',
    });

    setError('');
    setMessage('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function handleDelete(drive) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the placement drive for ${drive.company}?`
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await apiRequest(`/placements/${drive.id}`, {
        method: 'DELETE',
      });

      setDrives((current) =>
        current.filter((item) => item.id !== drive.id)
      );

      if (editingId === drive.id) {
        setForm(emptyForm);
        setEditingId(null);
      }

      setMessage('Placement drive deleted successfully.');
    } catch (err) {
      setError(err.message || 'Unable to delete placement drive.');
    }
  }

  return (
    <main className="placement-page">
      <header className="placement-header">
        <div>
          <h1>Placement Drives</h1>
          <p>Manage company placement opportunities for students.</p>
        </div>

        <button
          type="button"
          className="placement-secondary-button"
          onClick={loadDrives}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="placement-alert placement-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div
          className="placement-alert placement-success"
          role="status"
        >
          {message}
        </div>
      )}

      <section className="placement-panel">
        <h2>
          {editingId ? 'Edit Placement Drive' : 'Add Placement Drive'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="placement-form-grid">
            <label>
              Company Name *
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="e.g. Infosys"
                maxLength={100}
                required
              />
            </label>

            <label>
              Job Role *
              <input
                type="text"
                name="role"
                value={form.role}
                onChange={handleChange}
                placeholder="e.g. Software Developer"
                maxLength={100}
                required
              />
            </label>

            <label>
              Location *
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Nagpur or Pune"
                maxLength={100}
                required
              />
            </label>

            <label>
              Application Deadline *
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Minimum CGPA (0–10)
              <input
                type="number"
                name="minCgpa"
                value={form.minCgpa}
                onChange={handleChange}
                min="0"
                max="10"
                step="0.1"
                required
              />
            </label>

            <label>
              Drive Status
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <label className="placement-full-width">
              Job Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter job details and eligibility criteria"
                maxLength={2000}
                rows={4}
              />
            </label>
          </div>

          <div className="placement-form-actions">
            <button
              type="submit"
              className="placement-primary-button"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Update Drive'
                  : 'Add Drive'}
            </button>

            {editingId && (
              <button
                type="button"
                className="placement-secondary-button"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="placement-panel">
        <div className="placement-list-header">
          <h2>Available Placement Drives</h2>
          <span>{drives.length} total</span>
        </div>

        {loading ? (
          <p>Loading placement drives...</p>
        ) : drives.length === 0 ? (
          <div className="placement-empty">
            <h3>No placement drives yet</h3>
            <p>Add a placement drive using the form above.</p>
          </div>
        ) : (
          <div className="placement-table-wrapper">
            <table className="placement-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Deadline</th>
                  <th>Min. CGPA</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {drives.map((drive) => (
                  <tr key={drive.id}>
                    <td>{drive.company}</td>
                    <td>{drive.role}</td>
                    <td>{drive.location}</td>
                    <td>{drive.deadline}</td>
                    <td>{drive.minCgpa}</td>
                    <td>
                      <span
                        className={`placement-status ${
                          drive.status === 'closed'
                            ? 'is-closed'
                            : 'is-active'
                        }`}
                      >
                        {drive.status === 'closed' ? 'Closed' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="placement-row-actions">
                        <button
                          type="button"
                          className="placement-edit-button"
                          onClick={() => handleEdit(drive)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="placement-delete-button"
                          onClick={() => handleDelete(drive)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}