const express = require("express");

const {
    getStudentsByDepartment,
    markAttendance,
    getTodayAttendance,
    getDepartments,
    getTodayStudentsByBatch,
    getBatchStatusToday,
    getStudentTodayAttendance,
    createCorrectionRequest,
    getCorrectionRequests,
    approveCorrectionRequest,
    rejectCorrectionRequest,
    getTodayAttendanceReport,
    getDepartmentTodayReport
} = require("../controllers/attendanceController");

const { authenticateBatch } = require("../middleware/authMiddleware");
const { authenticateMaster } = require("../middleware/masterAuthMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads/corrections");
fs.mkdirSync(uploadDir, { recursive: true });

const correctionStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeBase = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .slice(0, 80);
        cb(null, `${Date.now()}-${safeBase}${ext}`);
    }
});

const correctionUpload = multer({
    storage: correctionStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
            return cb(new Error("Only PDF, JPG and PNG files are allowed"));
        }
        cb(null, true);
    }
});

// Public/student endpoints
router.get("/student/:rollNumber/today", getStudentTodayAttendance);
router.post("/correction", correctionUpload.single("supportingDocument"), createCorrectionRequest);


// Master coordinator endpoints
router.get("/batches/today", authenticateMaster, getBatchStatusToday);
router.get("/batch/:batch/today", authenticateMaster, getTodayStudentsByBatch);
router.post("/mark", authenticateMaster, markAttendance);

// Faculty correction request endpoints
router.get(
    "/corrections",
    authenticateMaster,
    getCorrectionRequests
);

router.patch(
    "/correction/:requestId/approve",
    authenticateMaster,
    approveCorrectionRequest
);

router.patch(
    "/correction/:requestId/reject",
    authenticateMaster,
    rejectCorrectionRequest
);

// Existing/legacy endpoints kept for compatibility with the current backend.
router.get("/students/:department", getStudentsByDepartment);
router.get("/today/:department", getTodayAttendance);
router.get("/departments", getDepartments);
router.get("/report/today/:batch", authenticateBatch, getTodayAttendanceReport);
router.get("/department/today/:department", getDepartmentTodayReport);

module.exports = router;
