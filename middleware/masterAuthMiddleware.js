const jwt = require("jsonwebtoken");

const authenticateMaster = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token required"
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "MASTER_COORDINATOR") {
            return res.status(403).json({
                success: false,
                message: "Master coordinator access required"
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

module.exports = { authenticateMaster };
