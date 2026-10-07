import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/master-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Invalid username or password.");
        return;
      }

      // Save JWT token for authenticated API requests
      localStorage.setItem("attendoraToken", data.token);

      // Save coordinator information
      if (data.coordinator) {
        localStorage.setItem(
          "attendoraCoordinator",
          JSON.stringify(data.coordinator)
        );
      }

      // Login successful
      navigate("/faculty-dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        "Unable to connect to Attendora server. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        {/* Logo */}
        <div className="login-heading">

          <div className="login-heading-icon">
            🎓
          </div>

          <h1>Attendora</h1>

          <h2>Faculty Login</h2>

          <p>
            Sign in to manage attendance
          </p>

        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>

          <div className="input-group">

            <label>Username</label>

            <div className="input-wrapper">

              <span>👤</span>

              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                required
              />

            </div>

          </div>

          <div className="input-group">

            <label>Password</label>

            <div className="input-wrapper">

              <span>🔒</span>

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? "🙈" : "👁"}
              </button>

            </div>

          </div>

          {error && (
            <div className="login-error">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
            {!loading && <span>→</span>}
          </button>

        </form>

        <div className="login-footer">
          <span>Attendora</span>
          <p>Faculty access only</p>
        </div>

      </div>

    </div>
  );
}

export default Login;