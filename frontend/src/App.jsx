
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Placeholder from './pages/Placeholder';

import AdminDashboard from './pages/admin/AdminDashboard';
import Students from './pages/admin/Students';
import Faculty from './pages/admin/Faculty';
import Courses from './pages/admin/Courses';
import PlacementDrives from './pages/PlacementDrives';

import FacultyDashboard from './pages/faculty/FacultyDashboard';
import MyCourses from './pages/faculty/MyCourses';
import Attendance from './pages/faculty/Attendance';
import Marks from './pages/faculty/Marks';
import StudentPerformance from './pages/faculty/StudentPerformance';

import StudentDashboard from './pages/student/StudentDashboard';
import MyProfile from './pages/student/MyProfile';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentMarks from './pages/student/StudentMarks';
import StudentPlacements from './pages/student/StudentPlacements';
import StudentApplications from './pages/student/StudentApplications';
import ResumeBuilder from './pages/student/ResumeBuilder';

function Home() {
  const { user } = useAuth();

  return (
    <Navigate to={user ? `/${user.role}` : '/login'} replace />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="faculty" element={<Faculty />} />
          <Route path="courses" element={<Courses />} />
          <Route path="drives" element={<PlacementDrives />} />
          <Route
            path="applications"
            element={
              <Placeholder
                title="Placement Applications"
                message="View and manage student applications for placement drives."
              />
            }
          />
          <Route
            path="reports"
            element={
              <Placeholder
                title="Reports"
                message="View academic and placement reports."
              />
            }
          />
          <Route
            path="settings"
            element={
              <Placeholder
                title="Settings"
                message="Manage college system settings."
              />
            }
          />
          <Route
            path="*"
            element={
              <Placeholder
                title="Page Not Found"
                message="The requested admin page does not exist."
              />
            }
          />
        </Route>
      </Route>

      {/* Faculty routes */}
      <Route element={<ProtectedRoute allowedRole="faculty" />}>
        <Route path="/faculty" element={<DashboardLayout />}>
          <Route index element={<FacultyDashboard />} />
          <Route path="courses" element={<MyCourses />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="marks" element={<Marks />} />
          <Route
            path="performance"
            element={<StudentPerformance />}
          />
          <Route
            path="*"
            element={
              <Placeholder
                title="Page Not Found"
                message="The requested faculty page does not exist."
              />
            }
          />
        </Route>
      </Route>

      {/* Student routes */}
      <Route element={<ProtectedRoute allowedRole="student" />}>
        <Route path="/student" element={<DashboardLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="results" element={<StudentMarks />} />
          <Route path="placements" element={<StudentPlacements />} />
          <Route path="applications" element={<StudentApplications />} />
          <Route path="resume" element={<ResumeBuilder />} />
          <Route
            path="*"
            element={
              <Placeholder
                title="Page Not Found"
                message="The requested student page does not exist yet."
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default App;
