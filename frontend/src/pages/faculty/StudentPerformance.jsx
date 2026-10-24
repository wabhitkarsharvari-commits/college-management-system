
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

function StudentPerformance() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const [courseResult, studentResult] = await Promise.all([
        apiRequest('/courses/mine'),
        apiRequest('/students'),
      ]);

      const loadedCourses = Array.isArray(courseResult?.courses)
        ? courseResult.courses.filter(Boolean)
        : [];

      const loadedStudents = Array.isArray(studentResult?.students)
        ? studentResult.students.filter(Boolean)
        : [];

      const courseResults = await Promise.allSettled(
        loadedCourses.map(async (course) => {
          const id = course.id || course._id;

          if (!id) {
            throw new Error(`Course ${course.name || ''} has no ID.`);
          }

          const [attendanceResult, marksResult] = await Promise.all([
            apiRequest(`/attendance/course/${encodeURIComponent(id)}`),
            apiRequest(`/marks/course/${encodeURIComponent(id)}`),
          ]);

          return {
            courseId: id,
            attendance: Array.isArray(attendanceResult?.attendance)
              ? attendanceResult.attendance
              : [],
            marks: Array.isArray(marksResult?.marks)
              ? marksResult.marks
              : [],
          };
        })
      );

      const allAttendance = [];
      const allMarks = [];
      const failedCourses = [];

      courseResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allAttendance.push(
            ...result.value.attendance.map((record) => ({
              ...record,
              courseId: record.courseId || result.value.courseId,
            }))
          );

          allMarks.push(
            ...result.value.marks.map((record) => ({
              ...record,
              courseId: record.courseId || result.value.courseId,
            }))
          );
        } else {
          failedCourses.push(
            `${loadedCourses[index]?.name || 'Course'}: ${
              result.reason?.message || 'Unable to load records.'
            }`
          );
        }
      });

      setCourses(loadedCourses);
      setStudents(loadedStudents);
      setAttendance(allAttendance);
      setMarks(allMarks);

      if (failedCourses.length) {
        setError(
          `Some performance records could not be loaded. ${failedCourses.join(' ')}`
        );
      }
    } catch (err) {
      setError(err?.message || 'Unable to load student performance.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const matchingStudents = useMemo(() => {
    const assignedStudents = students.filter((student) =>
      courses.some(
        (course) =>
          student.branch === course.branch &&
          String(student.semester) === String(course.semester)
      )
    );

    const unique = [
      ...new Map(
        assignedStudents.map((student) => [
          student.id || student._id || student.enrollmentNo || student.email,
          student,
        ])
      ).values(),
    ];

    const query = search.trim().toLowerCase();

    return unique.filter((student) => {
      const matchesSearch =
        !query ||
        [student.name, student.enrollmentNo, student.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCourse =
        selectedCourse === 'all' ||
        courses.some(
          (course) =>
            String(course.id || course._id) === selectedCourse &&
            course.branch === student.branch &&
            String(course.semester) === String(student.semester)
        );

      return matchesSearch && matchesCourse;
    });
  }, [students, courses, search, selectedCourse]);

  function getStudentRecords(student, type) {
    const studentId = student.id || student._id;

    const source = type === 'marks' ? marks : attendance;

    return source.filter((record) => {
      const recordStudentId = record.studentId;
      const course = courses.find(
        (item) =>
          String(item.id || item._id) === String(record.courseId)
      );

      const belongsToStudent =
        String(recordStudentId) === String(studentId) ||
        (student.enrollmentNo &&
          String(recordStudentId) === String(student.enrollmentNo));

      const belongsToCourse =
        course &&
        course.branch === student.branch &&
        String(course.semester) === String(student.semester);

      return (
        belongsToStudent &&
        belongsToCourse &&
        (selectedCourse === 'all' ||
          String(record.courseId) === selectedCourse)
      );
    });
  }

  function getMarksSummary(student) {
    const records = getStudentRecords(student, 'marks');

    let obtained = 0;
    let maximum = 0;
    let validRecords = 0;

    records.forEach((record) => {
      const score = Number(record.marks);
      const max = Number(record.maxMarks);

      if (
        Number.isFinite(score) &&
        Number.isFinite(max) &&
        max > 0 &&
        score >= 0 &&
        score <= max
      ) {
        obtained += score;
        maximum += max;
        validRecords += 1;
      }
    });

    if (!validRecords || maximum <= 0) {
      return { recorded: false, obtained: 0, maximum: 0, percentage: null, grade: '—' };
    }

    const percentage = (obtained / maximum) * 100;

    const grade =
      percentage >= 90 ? 'A+' :
      percentage >= 80 ? 'A' :
      percentage >= 70 ? 'B+' :
      percentage >= 60 ? 'B' :
      percentage >= 50 ? 'C' :
      percentage >= 40 ? 'D' : 'F';

    return {
      recorded: true,
      obtained,
      maximum,
      percentage,
      grade,
    };
  }

  function getAttendanceSummary(student) {
    const records = getStudentRecords(student, 'attendance').filter(
      (record) => ['Present', 'Absent'].includes(record.status)
    );

    const present = records.filter(
      (record) => record.status === 'Present'
    ).length;

    const absent = records.filter(
      (record) => record.status === 'Absent'
    ).length;

    const total = present + absent;

    return {
      recorded: total > 0,
      present,
      absent,
      total,
      percentage: total ? (present / total) * 100 : null,
    };
  }

  const performanceRows = matchingStudents.map((student) => ({
    student,
    marks: getMarksSummary(student),
    attendance: getAttendanceSummary(student),
  }));

  const recordedMarks = performanceRows.filter(
    (row) => row.marks.recorded
  );

  const recordedAttendance = performanceRows.filter(
    (row) => row.attendance.recorded
  );

  const averageMarks = recordedMarks.length
    ? recordedMarks.reduce((sum, row) => sum + row.marks.percentage, 0) /
      recordedMarks.length
    : null;

  const averageAttendance = recordedAttendance.length
    ? recordedAttendance.reduce(
        (sum, row) => sum + row.attendance.percentage,
        0
      ) / recordedAttendance.length
    : null;

  if (loading) return <Loader />;

  return (
    <>
      <div className="page-header performance-header">
        <div>
          <h1>Student Performance</h1>
          <p>Monitor academic results and attendance in your assigned classes.</p>
        </div>

        <button
          type="button"
          className="performance-refresh-btn"
          onClick={() => loadData(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh Records'}
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="card-grid performance-summary">
        <div className="panel performance-stat">
          <span>Total Assigned Courses</span>
          <h2>{courses.length}</h2>
          <small>Your assigned subjects</small>
        </div>

        <div className="panel performance-stat">
          <span>Students in Matching Classes</span>
          <h2>{matchingStudents.length}</h2>
          <small>Unique students in your classes</small>
        </div>

        <div className="panel performance-stat">
          <span>Average Marks</span>
          <h2>
            {averageMarks === null ? '—' : `${averageMarks.toFixed(1)}%`}
          </h2>
          <small>
            {recordedMarks.length} student(s) with recorded marks
          </small>
        </div>

        <div className="panel performance-stat">
          <span>Average Attendance</span>
          <h2>
            {averageAttendance === null
              ? '—'
              : `${averageAttendance.toFixed(1)}%`}
          </h2>
          <small>
            {recordedAttendance.length} student(s) with attendance
          </small>
        </div>
      </div>

      <div className="panel performance-panel">
        <div className="performance-title-row">
          <div>
            <h2>Student Performance Overview</h2>
            <p>Search students and review their saved academic records.</p>
          </div>
          <span className="performance-count">
            {performanceRows.length} student(s)
          </span>
        </div>

        <div className="performance-filters">
          <input
            type="search"
            aria-label="Search students"
            placeholder="Search name or enrollment number..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            aria-label="Filter by course"
            value={selectedCourse}
            onChange={(event) => setSelectedCourse(event.target.value)}
          >
            <option value="all">All assigned courses</option>
            {courses.map((course, index) => (
              <option
                key={course.id || course._id || index}
                value={String(course.id || course._id)}
              >
                {course.code || course.name} — Sem {course.semester}
              </option>
            ))}
          </select>
        </div>

        <div className="performance-table-wrap">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Enrollment No.</th>
                <th>Student Name</th>
                <th>Branch / Semester</th>
                <th>Marks</th>
                <th>Percentage</th>
                <th>Grade</th>
                <th>Attendance</th>
              </tr>
            </thead>

            <tbody>
              {performanceRows.map(({ student, marks, attendance }) => (
                <tr key={student.id || student._id || student.enrollmentNo}>
                  <td>{student.enrollmentNo || '—'}</td>
                  <td>
                    <strong>{student.name || '—'}</strong>
                    <small className="performance-email">
                      {student.email || ''}
                    </small>
                  </td>
                  <td>
                    {student.branch || '—'}
                    <small className="performance-email">
                      Semester {student.semester ?? '—'}
                    </small>
                  </td>
                  <td>
                    {marks.recorded
                      ? `${marks.obtained} / ${marks.maximum}`
                      : 'Not recorded'}
                  </td>
                  <td>
                    {marks.percentage === null
                      ? '—'
                      : `${marks.percentage.toFixed(1)}%`}
                  </td>
                  <td>
                    {marks.recorded ? (
                      <span
                        className={`performance-grade ${
                          marks.grade === 'F' ? 'grade-low' : 'grade-good'
                        }`}
                      >
                        {marks.grade}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {attendance.recorded ? (
                      <>
                        <strong>
                          {attendance.percentage.toFixed(1)}%
                        </strong>
                        <small className="performance-email">
                          {attendance.present} present · {attendance.absent} absent
                        </small>
                      </>
                    ) : 'Not recorded'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {performanceRows.length === 0 && (
          <p className="performance-empty">
            No students match your search or selected course.
          </p>
        )}

        <p className="performance-note">
          Percentages and grades are calculated from saved records. Grade
          thresholds shown here are illustrative and should be adjusted to
          your college's official grading rules.
        </p>
      </div>
    </>
  );
}

export default StudentPerformance;
