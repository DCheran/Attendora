const jwt = require("jsonwebtoken");

const authenticateBatch = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (decoded.role !== "BATCH_COORDINATOR") {
            return res.status(403).json({
                success: false,
                message: "Invalid coordinator role"
            });
        }

        req.coordinator = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token"
        });
    }
};


// Department coordinator authentication
const authenticateDepartment = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (decoded.role !== "DEPARTMENT_COORDINATOR") {
            return res.status(403).json({
                success: false,
                message: "Department coordinator access required"
            });
        }

        req.coordinator = decoded;

        next();

    } catch (error) {
        console.error("Department authentication error:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token"
        });
    }
};


module.exports = {
    authenticateBatch,
    authenticateDepartment
};