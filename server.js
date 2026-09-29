const express = require("express");
const cors = require("cors");
require("dotenv").config();

const prisma = require("./lib/prisma");
const authRoutes = require("./routes/auth");
const uploadRoutes = require("./routes/upload");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Auth routes
app.use("/api/auth", authRoutes);
// Upload routes
app.use("/api/upload", uploadRoutes);

// Main route
app.get("/", (req, res) => {
    res.json({
        status: "OK",
        service: "VEYLO API"
    });
});

// Database health check
app.get("/api/health/db", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            status: "OK",
            database: "connected"
        });
    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            status: "ERROR",
            database: "disconnected"
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`VEYLO API running on http://localhost:${PORT}`);
});
