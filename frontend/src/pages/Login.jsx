import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import Loader from '../components/Loader';

function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loader text="Loading..." />;
  if (user) return <Navigate to={`/${user.role}`} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedIn = await login(email.trim(), password);
      navigate(`/${loggedIn.role}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Engineering College Academic &amp; Placement Management System</h1>
        <p>Sign in to continue.</p>

        <Alert type="error">{error}</Alert>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button className="btn" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 16 }}>
          New student? <Link to="/register">Create an account</Link>
        </p>

        <div className="demo-box">
          <strong>Demo accounts (demo data):</strong>
          <div>Admin: admin@demo.college.edu / Admin@123</div>
          <div>Faculty: meera.rao@demo.college.edu / Faculty@123</div>
          <div>Student: riya.sharma@demo.college.edu / Student@123</div>
        </div>
      </div>
    </div>
  );
}

export default Login;