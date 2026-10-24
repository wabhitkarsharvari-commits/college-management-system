import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import Loader from '../components/Loader';

const BRANCHES = [
  'Information Technology',
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Civil',
];

const EMPTY = {
  name: '',
  enrollmentNo: '',
  branch: '',
  semester: '',
  email: '',
  password: '',
};

function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loader text="Loading..." />;
  if (user) return <Navigate to={`/${user.role}`} replace />;

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    for (const [field, value] of Object.entries(form)) {
      if (!String(value).trim()) {
        setError('Please fill in all fields.');
        return;
      }
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await register({ ...form, semester: Number(form.semester) });
      navigate(`/${created.role}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Student Registration</h1>
        <p>Faculty and admin accounts are created by the administrator.</p>

        <Alert type="error">{error}</Alert>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input id="name" className="form-control" value={form.name} onChange={update('name')} />
          </div>
          <div className="form-group">
            <label htmlFor="enrollmentNo">Enrollment number</label>
            <input
              id="enrollmentNo"
              className="form-control"
              value={form.enrollmentNo}
              onChange={update('enrollmentNo')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="branch">Branch</label>
            <select id="branch" className="form-control" value={form.branch} onChange={update('branch')}>
              <option value="">Select branch</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="semester">Semester</label>
            <select id="semester" className="form-control" value={form.semester} onChange={update('semester')}>
              <option value="">Select semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className="form-control"
              value={form.email}
              onChange={update('email')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className="form-control"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
            />
            <small>At least 8 characters, with a letter and a number.</small>
          </div>
          <button className="btn" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={{ marginTop: 16 }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;