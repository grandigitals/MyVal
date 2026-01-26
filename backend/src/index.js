// =====================================================
// MY VAL BACKEND - Main Entry Point
// =====================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const paymentRoutes = require("./routes/payment");
const matchRoutes = require("./routes/match");
const promoRoutes = require("./routes/promo");

const { initializeFirebase } = require("./services/firebase");

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase Admin
initializeFirebase();

// Middleware
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
        credentials: true,
    })
);
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Routes
app.use("/pay", paymentRoutes);
app.use("/match", matchRoutes);
app.use("/promo", promoRoutes);

// Health check
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "My Val Backend API",
        version: "1.0.0",
        endpoints: {
            "POST /pay/initiate": "Initialize a payment",
            "GET /pay/verify": "Verify a payment",
            "GET /match/reveal": "Reveal match if due", // optional (nice for you)
        },
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({
        success: false,
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 My Val Backend running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`\nEndpoints:`);
    console.log(`  POST /pay/initiate - Initialize payment`);
    console.log(`  GET  /pay/verify   - Verify payment`);
    console.log(`  GET  /match/reveal - Reveal match if due\n`);
});
