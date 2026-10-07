import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const [rollNumber, setRollNumber] = useState("");
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [supportingDocument, setSupportingDocument] = useState(null);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState("");
  const [correctionError, setCorrectionError] = useState("");
  const handleSearch = async (e) => {
    e.preventDefault();

    const roll = rollNumber.trim().toUpperCase();

    if (!roll) {
      setError("Please enter your roll number.");
      setStudent(null);
      return;
    }

    setLoading(true);
    setError("");
    setStudent(null);

    try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/attendance/student/${encodeURIComponent(
        roll
      )}/today`
    );
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.message || "Unable to fetch attendance."
        );
        return;
      }

      setStudent({
        name: data.student.name,
        rollNumber: data.student.rollNumber,
        department: data.student.department,
        batch: data.student.batch,
        status: data.status,
        date: data.date,
      });
    } catch (error) {
      console.error("Student attendance error:", error);

      setError(
        "Unable to connect to Attendora server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const submitCorrectionRequest = async (e) => {
    e.preventDefault();

    if (!student) {
      return;
    }

    if (!correctionReason.trim()) {
      setCorrectionError("Please enter a reason.");
      return;
    }

    setCorrectionLoading(true);
    setCorrectionMessage("");
    setCorrectionError("");

    try {
      const formData = new FormData();

      formData.append("rollNumber", student.rollNumber);
      formData.append("attendanceDate", student.date);
      formData.append("reason", correctionReason.trim());

      if (supportingDocument) {
        formData.append(
          "supportingDocument",
          supportingDocument
        );
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/attendance/correction`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setCorrectionError(
          data.message ||
          "Failed to submit correction request."
        );
        return;
      }

      setCorrectionMessage(
        "Correction request submitted successfully. Status: PENDING."
      );

      setCorrectionReason("");
      setSupportingDocument(null);
      setShowCorrectionForm(false);

    } catch (error) {
      console.error(
        "Correction request error:",
        error
      );

      setCorrectionError(
        "Unable to connect to Attendora server."
      );
    } finally {
      setCorrectionLoading(false);
    }
  };

  return (
    <div className="dashboard-page">

      {/* =========================================
          NAVBAR
      ========================================= */}

      <nav className="navbar">

        <div className="brand">

          <div className="brand-logo">
            A
          </div>

          <div className="brand-info">
            <h2>Attendora</h2>

            <span>
              Smart Attendance Management System
            </span>
          </div>

        </div>

        <button
          className="nav-login"
          onClick={() => navigate("/faculty-login")}
        >
          Faculty Login
        </button>

      </nav>


      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="dashboard-content">

        <section
          id="student-attendance"
          className="student-attendance-section"
        >

          {/* SECTION HEADING */}

          <div className="student-section-heading">

            <span>
              STUDENT PORTAL
            </span>

            <h2>
              Check Today's Attendance
            </h2>

            <p>
              Enter your college roll number to view
              today's attendance status.
            </p>

          </div>


          {/* =========================================
              SEARCH CARD
          ========================================= */}

          <div className="student-search-card">

            <div className="search-icon">
              🎓
            </div>

            <div className="search-content">

              <h3>
                Enter Roll Number
              </h3>

              <p>
                Enter your registered college roll number
                to fetch today's attendance.
              </p>

              <form
                className="roll-search-form"
                onSubmit={handleSearch}
              >

                <input
                  type="text"
                  placeholder="Example: 24881A6701"
                  value={rollNumber}
                  onChange={(e) =>
                    setRollNumber(e.target.value)
                  }
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Checking..."
                    : "View Attendance"}
                </button>

              </form>


              {/* ERROR */}

              {error && (
                <div className="search-error">
                  ⚠ {error}
                </div>
              )}

            </div>

          </div>


          {/* =========================================
              STUDENT RESULT
          ========================================= */}

          {student && (

            <div className="student-result">

              {/* STUDENT HEADER */}

              <div className="student-result-header">

                <div className="student-avatar">
                  {student.name.charAt(0).toUpperCase()}
                </div>

                <div className="student-name">

                  <h2>
                    {student.name}
                  </h2>

                  <p>
                    {student.rollNumber}
                  </p>

                </div>

                <div
                  className={
                    student.status === "PRESENT"
                      ? "today-present"
                      : "today-absent"
                  }
                >
                  {student.status === "PRESENT"
                    ? "✓ Present"
                    : "✕ Absent"}
                </div>

              </div>


              {/* STUDENT INFORMATION */}

              <div className="student-info-grid">

                <div>
                  <span>
                    Department
                  </span>

                  <strong>
                    {student.department}
                  </strong>
                </div>


                <div>
                  <span>
                    Batch
                  </span>

                  <strong>
                    {student.batch}
                  </strong>
                </div>


                <div>
                  <span>
                    Date
                  </span>

                  <strong>
                    {new Date(
                      `${student.date}T00:00:00`
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </div>

              </div>


              {/* TODAY'S ATTENDANCE */}

              <div className="attendance-result-grid">

                <div className="result-card">

                  <span className="result-icon">
                    📋
                  </span>

                  <div>

                    <span>
                      Today's Attendance
                    </span>

                    <strong>
                      {student.status === "PRESENT"
                        ? "PRESENT"
                        : "ABSENT"}
                    </strong>
                    
                  </div>
                  
                </div>
                {student.status === "ABSENT" && (
                  <>
                    <div className="correction-request-section">
                      <button
                        type="button"
                        className="correction-button"
                        onClick={() => {
                          setShowCorrectionForm(true);
                          setCorrectionError("");
                          setCorrectionMessage("");
                        }}
                      >
                        📝 Request Attendance Correction
                      </button>
                    </div>

                    {showCorrectionForm && (
                      <div className="correction-form-card">
                        <div className="correction-form-header">
                          <h3>Attendance Correction Request</h3>
                          <p>
                            Submit a request if you believe you were incorrectly marked absent.
                          </p>
                        </div>

                        <form onSubmit={submitCorrectionRequest}>
                          <div className="correction-info-grid">
                            <div>
                              <label>Roll Number</label>
                              <input
                                type="text"
                                value={student.rollNumber}
                                readOnly
                              />
                            </div>

                            <div>
                              <label>Student Name</label>
                              <input
                                type="text"
                                value={student.name}
                                readOnly
                              />
                            </div>

                            <div>
                              <label>Batch</label>
                              <input
                                type="text"
                                value={student.batch}
                                readOnly
                              />
                            </div>

                            <div>
                              <label>Attendance Date</label>
                              <input
                                type="text"
                                value={student.date}
                                readOnly
                              />
                            </div>

                            <div>
                              <label>Current Status</label>
                              <input
                                type="text"
                                value="ABSENT"
                                readOnly
                              />
                            </div>
                          </div>

                          <div className="correction-field">
                            <label>Reason</label>

                            <textarea
                              placeholder="Explain why you believe your attendance should be corrected..."
                              value={correctionReason}
                              onChange={(e) => setCorrectionReason(e.target.value)}
                              rows="4"
                              required
                            />
                          </div>

                          <div className="correction-field">
                            <label>
                              Supporting Document <span>(Optional)</span>
                            </label>

                            <input
                              type="file"
                              onChange={(e) =>
                                setSupportingDocument(e.target.files[0] || null)
                              }
                            />
                          </div>

                          {correctionError && (
                            <div className="correction-error">
                              ❌ {correctionError}
                            </div>
                          )}

                          {correctionMessage && (
                            <div className="correction-success">
                              ✓ {correctionMessage}
                            </div>
                          )}

                          <div className="correction-actions">
                            <button
                              type="button"
                              className="cancel-correction"
                              onClick={() => {
                                setShowCorrectionForm(false);
                                setCorrectionError("");
                              }}
                            >
                              Cancel
                            </button>

                            <button
                              type="submit"
                              className="submit-correction"
                              disabled={correctionLoading}
                            >
                              {correctionLoading
                                ? "Submitting..."
                                : "Submit Request"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>

          )}

        </section>

      </main>


      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="site-footer">

        <div className="footer-left">

          <h3>
            Attendora
          </h3>

          <p>
            Smart Attendance Management System
          </p>

        </div>

        <div className="footer-right">
          © 2026 Attendora
        </div>

      </footer>

    </div>
  );
}

export default Dashboard;