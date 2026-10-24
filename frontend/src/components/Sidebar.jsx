import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MENUS = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/students', label: 'Students' },
    { to: '/admin/faculty', label: 'Faculty' },
    { to: '/admin/courses', label: 'Courses' },
    { to: '/admin/drives', label: 'Placement Drives' },
    { to: '/admin/applications', label: 'Applications' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/settings', label: 'Settings' },
  ],
  faculty: [
    { to: '/faculty', label: 'Dashboard', end: true },
    { to: '/faculty/courses', label: 'My Courses' },
    { to: '/faculty/attendance', label: 'Attendance' },
    { to: '/faculty/marks', label: 'Marks' },
    { to: '/faculty/performance', label: 'Student Performance' },
  ],
  student: [
    { to: '/student', label: 'Dashboard', end: true },
    { to: '/student/profile', label: 'My Profile' },
    { to: '/student/attendance', label: 'Attendance' },
    { to: '/student/results', label: 'Marks & Grades' },
    { to: '/student/placements', label: 'Placement Drives' },
    { to: '/student/applications', label: 'My Applications' },
    { to: '/student/resume', label: 'Resume Builder' },
  ],
};

function Sidebar({ open, onNavigate }) {
  const { user } = useAuth();
  const items = MENUS[user.role] || [];

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <h2>Engineering College</h2>
        <span>Academic &amp; Placement System</span>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;