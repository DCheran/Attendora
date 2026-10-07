import { Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import FacultyDashboard from "./pages/FacultyDashboard.jsx";

function App() {
  return (
    <Routes>

      <Route path="/" element={<Dashboard />} />

      <Route path="/faculty-login" element={<Login />} />

      <Route
        path="/faculty-dashboard"
        element={<FacultyDashboard />}
      />

    </Routes>
  );
}

export default App;