const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/pgdb");

const batchLogin = async (req, res) => {
    try {
        const { batch, password } = req.body;

        if (!batch || !password) {
            return res.status(400).json({
                success: false,
                message: "Batch and password are required"
            });
        }

        const result = await db.query(
            `
            SELECT id, batch, password_hash
            FROM batch_credentials
            WHERE batch = $1
            `,
            [batch]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid batch or password"
            });
        }

        const batchAccount = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            batchAccount.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid batch or password"
            });
        }

        const token = jwt.sign(
            {
                batch: batchAccount.batch,
                role: "BATCH_COORDINATOR"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "12h"
            }
        );

        res.json({
            success: true,
            message: "Batch login successful",
            batch: batchAccount.batch,
            token
        });

    } catch (error) {
        console.error("Batch login error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


const departmentLogin = async (req, res) => {
    try {
        const { collegeId, password } = req.body;

        if (!collegeId || !password) {
            return res.status(400).json({
                success: false,
                message: "College ID and password are required"
            });
        }

        const result = await db.query(
            `
            SELECT
                dc.id,
                dc.college_id,
                dc.name,
                dc.email,
                dc.password_hash,
                d.name AS department
            FROM department_coordinators dc
            JOIN departments d
                ON dc.department_id = d.id
            WHERE dc.college_id = $1
            `,
            [collegeId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid college ID or password"
            });
        }

        const coordinator = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            coordinator.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid college ID or password"
            });
        }

        const token = jwt.sign(
            {
                coordinatorId: coordinator.id,
                collegeId: coordinator.college_id,
                department: coordinator.department,
                role: "DEPARTMENT_COORDINATOR"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "12h"
            }
        );

        res.json({
            success: true,
            message: "Department coordinator login successful",
            coordinator: {
                collegeId: coordinator.college_id,
                name: coordinator.name,
                email: coordinator.email,
                department: coordinator.department
            },
            token
        });

    } catch (error) {
        console.error("Department login error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


const masterLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        const result = await db.query(
            `
            SELECT
                id,
                username,
                password_hash,
                name,
                email
            FROM master_credentials
            WHERE username = $1
              AND is_active = TRUE
            `,
            [username.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const master = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            master.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const token = jwt.sign(
            {
                masterId: master.id,
                username: master.username,
                name: master.name,
                email: master.email,
                role: "MASTER_COORDINATOR"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "12h"
            }
        );

        return res.json({
            success: true,
            message: "Login successful",
            coordinator: {
                username: master.username,
                name: master.name,
                email: master.email
            },
            token
        });

    } catch (error) {
        console.error("Master login error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


module.exports = {
    batchLogin,
    departmentLogin,
    masterLogin
};