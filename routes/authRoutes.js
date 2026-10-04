const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

// Final Attendora login used by the coordinator/master UI.
router.post(
    "/master-login",
    authController.masterLogin
);

// Existing endpoints kept for backward compatibility.
router.post(
    "/batch-login",
    authController.batchLogin
);

router.post(
    "/department-login",
    authController.departmentLogin
);

module.exports = router;
