const express = require("express");
const cors = require("cors");
require("dotenv").config();

const attendanceRoutes = require("./routes/attendanceRoutes");
const authRoutes = require("./routes/authRoutes");
const departmentRoutes = require("./routes/departmentRoutes");

const {
    startDailyReportScheduler
} = require("./services/dailyReportScheduler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Attendora Attendance API is running"
    });
});

app.use("/api/attendance", attendanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/department",departmentRoutes);
startDailyReportScheduler();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Attendance server running on port ${PORT}`);
});