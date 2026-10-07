import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./FacultyDashboard.css";

function FacultyDashboard() {

  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("attendance");

  const [selectedBatch, setSelectedBatch] = useState("");
  const [facultyCollegeId, setFacultyCollegeId] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [attendanceError, setAttendanceError] = useState("");

  const [selectedEvent, setSelectedEvent] = useState("");

  const [students, setStudents] = useState([
    {
      id: 2,
      roll: "24881A6702",
      name: "RAHUL KUMAR",
      department: "CSD",
      present: true
    },
    {
      id: 3,
      roll: "24881A6703",
      name: "PRIYA SHARMA",
      department: "CSD",
      present: false
    },
    {
      id: 4,
      roll: "24881A6704",
      name: "SHANTHI VARDHAN",
      department: "CSD",
      present: true
    },
    {
      id: 5,
      roll: "24881A6705",
      name: "VARUN REDDY",
      department: "CSD",
      present: true
    }
  ]);

  const [events] = useState([
    "Smart India Hackathon",
    "Tech Fest 2026",
    "AI Workshop",
    "Cyber Security Seminar",
    "Coding Contest"
  ]);

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [requestActionLoading, setRequestActionLoading] = useState(null);

  const presentCount =
    students.filter((student) => student.present).length;

  const absentCount =
    students.length - presentCount;

  const departmentOrder = ["CSD", "CSE", "CSM", "IT","Mech","EEE","ECE"];

  const groupedStudents = departmentOrder
    .map((department) => ({
      department,
      students: students
        .filter((student) => student.department === department)
        .sort((a, b) => {
          const aMatch = a.roll.match(/\d+/);
          const bMatch = b.roll.match(/\d+/);

          const aNumber = aMatch ? parseInt(aMatch[0], 10) : Infinity;
          const bNumber = bMatch ? parseInt(bMatch[0], 10) : Infinity;

          if (aNumber !== bNumber) {
            return aNumber - bNumber;
          }

          return a.roll.localeCompare(b.roll, undefined, {
            sensitivity: "base",
          });
        })
    }))
    .filter((group) => group.students.length > 0);

  const pendingRequests =
    requests.filter(
      (request) => request.status === "Pending"
    ).length;
  
  const loadStudentsByBatch = async (batch) => {
    if (!batch) {
      setStudents([]);
      setAttendanceMessage("");
      setAttendanceError("");
      return;
    }

    setLoadingStudents(true);
    setAttendanceMessage("");
    setAttendanceError("");

    try {
      const token = localStorage.getItem("attendoraToken");

      if (!token) {
        setAttendanceError("Login session expired. Please login again.");
        navigate("/faculty-login");
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/attendance/batch/${batch}/today`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStudents([]);
        setAttendanceError(
          data.message || "Unable to load students."
        );
        return;
      }

      // Batch is not scheduled for today
      if (data.classToday === false) {
        setStudents([]);
        setAttendanceMessage(
          data.message || `${batch} is not scheduled for today.`
        );
        return;
      }

      // Convert department-grouped response into one student array
      const loadedStudents = Object.entries(data.departments || {})
        .flatMap(([department, departmentStudents]) =>
          departmentStudents.map((student) => ({
            id: student.studentId,
            roll: student.rollNumber,
            name: student.studentName,
            department: department,
            present: student.status === "PRESENT",
          }))
        );

      setStudents(loadedStudents);
    } catch (error) {
      console.error("Error loading students:", error);

      setStudents([]);
      setAttendanceError(
        "Unable to connect to Attendora server."
      );
    } finally {
      setLoadingStudents(false);
    }
  };
  

  const toggleAttendance = (id) => {

    setStudents(
      students.map((student) =>
        student.id === id
          ? {
              ...student,
              present: !student.present
            }
          : student
      )
    );

  };

  const markAllPresent = () => {

    setStudents(
      students.map((student) => ({
        ...student,
        present: true
      }))
    );

  };

  const markAllAbsent = () => {

    setStudents(
      students.map((student) => ({
        ...student,
        present: false
      }))
    );

  };

  const saveAttendance = async () => {
    if (!selectedBatch) {
      setAttendanceError("Please select a batch.");
      return;
    }

    if (!facultyCollegeId.trim()) {
      setAttendanceError("Please enter College ID.");
      return;
    }

    if (!facultyEmail.trim()) {
      setAttendanceError("Please enter Email.");
      return;
    }

    if (students.length === 0) {
      setAttendanceError("No students available for this batch.");
      return;
    }

    setAttendanceError("");
    setAttendanceMessage("");
    setLoadingStudents(true);

    try {
      const token = localStorage.getItem("attendoraToken");

      if (!token) {
        setAttendanceError("Login session expired. Please login again.");
        navigate("/faculty-login");
        return;
      }

      // Current date in India
      const attendanceDate = new Date().toLocaleDateString(
        "en-CA",
        {
          timeZone: "Asia/Kolkata",
        }
      );

      const attendance = students.map((student) => ({
        studentId: student.id,
        status: student.present ? "PRESENT" : "ABSENT",
      }));

      const response = await fetch(
        "http://localhost:5000/api/attendance/mark",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            batch: selectedBatch,
            attendanceDate,
            facultyCollegeId: facultyCollegeId.trim(),
            facultyEmail: facultyEmail.trim(),
            attendance,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setAttendanceError(
          data.message || "Failed to save attendance."
        );
        return;
      }

      setAttendanceMessage(
        `Attendance saved successfully. ${data.saved} students updated.`
      );

    } catch (error) {
      console.error("Save attendance error:", error);

      setAttendanceError(
        "Unable to connect to Attendora server."
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  const renderAttendance = () => (

    <>

      <div className="page-header">

        <div>
          <h1>Attendance</h1>

          <p>
            Take today's attendance
          </p>
        </div>

        <div className="date-box">
          {new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </div>

      </div>

      <div className="selection-card">

        <div className="select-group">

          <label>Batch</label>

          <select
            value={selectedBatch}
            onChange={(e) => {
              const batch = e.target.value;
              setSelectedBatch(batch);
              loadStudentsByBatch(batch);
            }
          }
          >

            <option value="">
              Select Batch
            </option>

            <option>G1B1</option>
            <option>G1B2</option>
            <option>G1B3</option>

            <option>G2B1</option>
            <option>G2B2</option>
            <option>G2B3</option>

            <option>G3B1</option>
            <option>G3B2</option>

          </select>

        </div>

        <div className="select-group">

          <label>College ID</label>

          <input
            type="text"
            placeholder="Enter college ID"
            value={facultyCollegeId}
            onChange={(e) =>
              setFacultyCollegeId(e.target.value)
            }
          />

        </div>

        <div className="select-group">

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter email address"
            value={facultyEmail}
            onChange={(e) =>
              setFacultyEmail(e.target.value)
            }
          />

        </div>

      </div>

      <div className="attendance-stats">

        <div className="stat-card">
          <span>👥</span>
          <div>
            <strong>{students.length}</strong>
            <p>Total Students</p>
          </div>
        </div>

        <div className="stat-card present-stat">
          <span>✓</span>
          <div>
            <strong>{presentCount}</strong>
            <p>Present</p>
          </div>
        </div>

        <div className="stat-card absent-stat">
          <span>✕</span>
          <div>
            <strong>{absentCount}</strong>
            <p>Absent</p>
          </div>
        </div>

      </div>
      
      {loadingStudents && (
        <div className="attendance-message">
          Loading students...
        </div>
      )}

      {attendanceMessage && !loadingStudents && (
        <div className="attendance-message">
          ℹ️ {attendanceMessage}
        </div>
      )}

      {attendanceError && !loadingStudents && (
        <div className="attendance-error">
          ❌ {attendanceError}
        </div>
      )}

      <div className="attendance-card">

        <div className="attendance-card-header">

          <h2>Student Attendance</h2>

          <div>

            <button
              className="all-present"
              onClick={markAllPresent}
            >
              Mark All Present
            </button>

            <button
              className="all-absent"
              onClick={markAllAbsent}
            >
              Mark All Absent
            </button>

          </div>

        </div>

        <div className="department-sections">

          {groupedStudents.map((group) => (

            <div
              className="department-section"
              key={group.department}
            >

              <div className="department-header">
                <div>
                  <h3>{group.department}</h3>
                  <span>
                    {group.students.length} students
                  </span>
                </div>
              </div>

              <div className="student-table">

                <div className="table-header">
                  <span>Roll Number</span>
                  <span>Student Name</span>
                  <span>Department</span>
                  <span>Attendance</span>
                </div>

                {group.students.map((student) => (

                  <div
                    className="student-row"
                    key={student.id}
                  >

                    <span>{student.roll}</span>

                    <strong>{student.name}</strong>

                    <span>{student.department}</span>

                    <button
                      className={
                        student.present
                          ? "attendance-present"
                          : "attendance-absent"
                      }
                      onClick={() =>
                        toggleAttendance(student.id)
                      }
                    >
                      {student.present
                        ? "✓ Present"
                        : "✕ Absent"}
                    </button>

                  </div>

                ))}

              </div>

            </div>

          ))}

        </div>

        <button
          className="submit-attendance"
          onClick={saveAttendance}
          disabled={loadingStudents}
        >
          {loadingStudents ? "Saving Attendance..." : "Save Attendance"}
        </button>

      </div>

    </>
  );

  const renderEventAttendance = () => (

    <>

      <div className="page-header">

        <div>

          <h1>Event Attendance</h1>

          <p>
            Take attendance for college events
          </p>

        </div>

        <div className="date-box">
          29 September 2026
        </div>

      </div>

      <div className="event-selection">

        <label>Select Event</label>

        <select
          value={selectedEvent}
          onChange={(e) =>
            setSelectedEvent(e.target.value)
          }
        >

          <option value="">
            Select an event
          </option>

          {events.map((event) => (
            <option
              key={event}
              value={event}
            >
              {event}
            </option>
          ))}

        </select>

      </div>

      {selectedEvent && (

        <div className="attendance-card">

          <div className="event-title">

            <div className="event-icon">
              🎫
            </div>

            <div>
              <h2>{selectedEvent}</h2>

              <p>
                Event participant attendance
              </p>
            </div>

          </div>

          <div className="attendance-stats">

            <div className="stat-card">
              <span>👥</span>
              <div>
                <strong>{students.length}</strong>
                <p>Participants</p>
              </div>
            </div>

            <div className="stat-card present-stat">
              <span>✓</span>
              <div>
                <strong>{presentCount}</strong>
                <p>Present</p>
              </div>
            </div>

            <div className="stat-card absent-stat">
              <span>✕</span>
              <div>
                <strong>{absentCount}</strong>
                <p>Absent</p>
              </div>
            </div>

          </div>

          <div className="student-table">

            <div className="table-header">

              <span>Roll Number</span>
              <span>Participant</span>
              <span>Department</span>
              <span>Attendance</span>

            </div>

            {students.map((student) => (

              <div
                className="student-row"
                key={student.id}
              >

                <span>{student.roll}</span>

                <strong>{student.name}</strong>

                <span>{student.department}</span>

                <button
                  className={
                    student.present
                      ? "attendance-present"
                      : "attendance-absent"
                  }
                  onClick={() =>
                    toggleAttendance(student.id)
                  }
                >

                  {student.present
                    ? "✓ Present"
                    : "✕ Absent"}

                </button>

              </div>

            ))}

          </div>

          <button className="submit-attendance">
            Submit Event Attendance
          </button>

        </div>

      )}

    </>
  );

  const loadCorrectionRequests = async () => {
      const token = localStorage.getItem("attendoraToken");

      if (!token) {
          navigate("/faculty-login");
          return;
      }

      setRequestsLoading(true);
      setRequestsError("");

      try {
          const response = await fetch(
              "http://localhost:5000/api/attendance/corrections",
              {
                  headers: {
                      Authorization: `Bearer ${token}`
                  }
              }
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
              setRequestsError(
                  data.message || "Failed to load correction requests."
              );
              return;
          }

          setRequests(data.requests || []);

      } catch (error) {
          console.error("Load correction requests error:", error);

          setRequestsError(
              "Unable to connect to Attendora server."
          );

      } finally {
          setRequestsLoading(false);
      }
  };


const renderRequests = () => (
    <>
        <div className="page-header">
            <div>
                <h1>Attendance Requests</h1>

                <p>
                    Review student attendance correction requests
                </p>
            </div>

            <button
                className="refresh-requests-button"
                onClick={loadCorrectionRequests}
                disabled={requestsLoading}
            >
                {requestsLoading ? "Refreshing..." : "↻ Refresh"}
            </button>
        </div>

        <div className="request-summary">
            <div>
                <strong>{pendingRequests}</strong>
                <span>Pending Requests</span>
            </div>

            <div>
                <strong>{requests.length}</strong>
                <span>Total Requests</span>
            </div>
        </div>

        {requestsError && (
            <div className="requests-error">
                ❌ {requestsError}
            </div>
        )}

        {requestsLoading && requests.length === 0 && (
            <div className="empty-page">
                <p>Loading attendance requests...</p>
            </div>
        )}

        {!requestsLoading && requests.length === 0 && !requestsError && (
            <div className="empty-page">
                <h2>No Attendance Requests</h2>
                <p>
                    There are currently no correction requests.
                </p>
            </div>
        )}

        <div className="requests-list">
            {requests.map((request) => (
                <div
                    className="request-card"
                    key={request.requestId}
                >
                    <div className="request-top">

                        <div className="request-avatar">
                            {request.studentName
                                ?.charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>
                            <h3>{request.studentName}</h3>

                            <p>
                                {request.rollNumber}
                            </p>
                        </div>

                        <span
                            className={
                                request.status === "PENDING"
                                    ? "pending-status"
                                    : request.status === "APPROVED"
                                    ? "approved-status"
                                    : "rejected-status"
                            }
                        >
                            {request.status}
                        </span>
                    </div>

                    <div className="request-info">

                        <p>
                            <strong>Department:</strong>{" "}
                            {request.department}
                        </p>

                        <p>
                            <strong>Batch:</strong>{" "}
                            {request.batch}
                        </p>

                        <p>
                            <strong>Date:</strong>{" "}
                            {new Date(request.attendanceDate).toLocaleDateString("en-CA", {
                                timeZone: "Asia/Kolkata",
                            })}
                        </p>

                        <p>
                            <strong>Current Status:</strong>{" "}
                            {request.currentStatus}
                        </p>

                        <p>
                            <strong>Reason:</strong>{" "}
                            {request.reason}
                        </p>

                        {request.supportingDocument && (
                            <p>
                                <strong>Supporting Document:</strong>{" "}
                                {request.supportingDocument}
                            </p>
                        )}
                    </div>

                    <div className="request-actions">

                        {request.status === "PENDING" ? (
                            <>
                                <button
                                    className="approve-button"
                                    onClick={() =>
                                        approveRequest(
                                            request.requestId
                                        )
                                    }
                                    disabled={
                                        requestActionLoading ===
                                        request.requestId
                                    }
                                >
                                    {requestActionLoading ===
                                    request.requestId
                                        ? "Processing..."
                                        : "✓ Approve"}
                                </button>

                                <button
                                    className="reject-button"
                                    onClick={() =>
                                        rejectRequest(
                                            request.requestId
                                        )
                                    }
                                    disabled={
                                        requestActionLoading ===
                                        request.requestId
                                    }
                                >
                                    {requestActionLoading ===
                                    request.requestId
                                        ? "Processing..."
                                        : "✕ Reject"}
                                </button>
                            </>
                        ) : (
                            <span
                                className={
                                    request.status === "APPROVED"
                                        ? "approved-status"
                                        : "rejected-status"
                                }
                            >
                                {request.status}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </>
);

    const approveRequest = async (requestId) => {
      const token = localStorage.getItem("attendoraToken");

      if (!token) {
          navigate("/faculty-login");
          return;
      }

      setRequestActionLoading(requestId);

      try {
          const response = await fetch(
              `http://localhost:5000/api/attendance/correction/${requestId}/approve`,
              {
                  method: "PATCH",
                  headers: {
                      Authorization: `Bearer ${token}`
                  }
              }
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
              alert(
                  data.message || "Failed to approve correction request."
              );
              return;
          }

          await loadCorrectionRequests();

      } catch (error) {
          console.error("Approve request error:", error);
          alert("Unable to connect to Attendora server.");

      } finally {
          setRequestActionLoading(null);
      }
  };

  const rejectRequest = async (requestId) => {
      const token = localStorage.getItem("attendoraToken");

      if (!token) {
          navigate("/faculty-login");
          return;
      }

      setRequestActionLoading(requestId);

      try {
          const response = await fetch(
              `http://localhost:5000/api/attendance/correction/${requestId}/reject`,
              {
                  method: "PATCH",
                  headers: {
                      Authorization: `Bearer ${token}`
                  }
              }
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
              alert(
                  data.message || "Failed to reject correction request."
              );
              return;
          }

          await loadCorrectionRequests();

      } catch (error) {
          console.error("Reject request error:", error);
          alert("Unable to connect to Attendora server.");

      } finally {
          setRequestActionLoading(null);
      }
  };

  return (

    <div className="faculty-layout">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <div className="brand-logo">
            A
          </div>

          <div>
            <h2>Attendora</h2>
            <span>Faculty Portal</span>
          </div>

        </div>

        <div className="faculty-profile">

          <div className="faculty-avatar">
            F
          </div>

          <div>
            <strong>Coordinator</strong>
            <span>PAT Coordinator</span>
          </div>

        </div>

        <nav className="sidebar-menu">

          <button
            className={
              activePage === "attendance"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => setActivePage("attendance")}
          >
            <span>📋</span>
            Attendance
          </button>

          <button
            className={
              activePage === "event"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => setActivePage("event")}
          >
            <span>🎫</span>
            Event Attendance
          </button>

          <button
            className={
              activePage === "requests"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => {
              setActivePage("requests");
              loadCorrectionRequests();
            }}
          >
            <span>📩</span>
            Attendance Requests

            {pendingRequests > 0 && (
              <b className="request-badge">
                {pendingRequests}
              </b>
            )}
          </button>

        </nav>

        <button
          className="logout-button"
          onClick={() => {
            localStorage.removeItem("attendoraToken");
            localStorage.removeItem("attendoraCoordinator");
            navigate("/faculty-login");
          }}
        >
          🚪 Logout
        </button>

      </aside>

      {/* MAIN CONTENT */}

      <main className="faculty-main">

        {activePage === "attendance" &&
          renderAttendance()}

        {activePage === "event" &&
          renderEventAttendance()}

        {activePage === "requests" &&
          renderRequests()}

        {activePage === "history" && (

          <div className="empty-page">

            <h1>Attendance History</h1>

            <p>
              Attendance history will appear here.
            </p>

          </div>

        )}

        {activePage === "students" && (

          <div className="empty-page">

            <h1>Students</h1>

            <p>
              Student management will appear here.
            </p>

          </div>

        )}

      </main>

    </div>
  );
}

export default FacultyDashboard;    