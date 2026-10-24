import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          ☰
        </button>
        <span className="topbar-title">Engineering College Portal</span>
      </div>
      <div className="topbar-right">
        <span className="user-name">{user.name}</span>
        <span className="role-badge">{user.role}</span>
        <button className="btn btn-secondary btn-small" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Topbar;