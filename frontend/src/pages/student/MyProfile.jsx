import { useEffect, useState } from 'react';
import { apiRequest } from '../../api/client';
import DataTable from '../../components/DataTable';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

function MyProfile() {
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiRequest('/students/me'), apiRequest('/courses/mine')])
      .then(([s, c]) => {
        setStudent(s.student);
        setCourses(c.courses);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const columns = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Course', sortable: true },
    { key: 'credits', label: 'Credits' },
    { key: 'facultyName', label: 'Faculty', render: (c) => c.facultyName || 'Unassigned' },
  ];

  return (
    <>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Your academic details and subjects for this semester.</p>
      </div>

      <Alert type="error">{error}</Alert>

      {student && (
        <div className="panel">
          <div className="profile-grid">
            <div><span>Name</span><strong>{student.name}</strong></div>
            <div><span>Enrollment number</span><strong>{student.enrollmentNo}</strong></div>
            <div><span>Branch</span><strong>{student.branch}</strong></div>
            <div><span>Semester</span><strong>{student.semester}</strong></div>
            <div><span>Email</span><strong>{student.email}</strong></div>
            <div><span>CGPA</span><strong>{student.cgpa}</strong></div>
            <div><span>Academic percentage</span><strong>{student.academicPercentage}%</strong></div>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>My subjects</h2>
        <DataTable
          columns={columns}
          rows={courses}
          emptyTitle="No subjects yet"
          emptyMessage="No courses exist yet for your branch and semester."
        />
      </div>
    </>
  );
}

export default MyProfile;