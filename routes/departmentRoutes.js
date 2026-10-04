const express = require("express");

const {
    getDepartmentToday
} = require("../controllers/departmentController");

const {
    authenticateDepartment
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/today",
    authenticateDepartment,
    getDepartmentToday
);

module.exports = router;