// =====================================================
// MY VAL BACKEND - Match Routes
// Provides /match/status and /match/reveal endpoints
// =====================================================

const express = require("express");
const {
    verifyFirebaseToken,
    getMatchWithDetails,
    markUserRevealed,
    getUser
} = require("../services/firebase");
const { getRevealConfig } = require("../services/matching");

const router = express.Router();

// =====================================================
// GET /match/status - Get current match state + reveal time
// This is the main endpoint for frontend to check status
// =====================================================
router.get("/status", async (req, res) => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Missing Authorization Bearer token"
            });
        }

        const decoded = await verifyFirebaseToken(token);
        const uid = decoded.uid;

        // Get match details from database
        const status = await getMatchWithDetails(uid);

        if (!status.found) {
            return res.status(404).json({
                success: false,
                error: status.error || "User not found"
            });
        }

        // Get server reveal config (for users without revealAt set yet)
        const revealConfig = getRevealConfig();

        return res.json({
            success: true,
            ...status,
            serverConfig: {
                testMode: revealConfig.testMode,
                defaultRevealAtMs: revealConfig.revealAtMs,
                defaultRevealAt: new Date(revealConfig.revealAtMs).toISOString()
            }
        });

    } catch (e) {
        console.error("Match status error:", e);
        return res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

// =====================================================
// GET /match/reveal - Mark match as revealed (legacy support)
// =====================================================
router.get("/reveal", async (req, res) => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Missing Authorization Bearer token"
            });
        }

        const decoded = await verifyFirebaseToken(token);
        const uid = decoded.uid;

        // Get current status
        const status = await getMatchWithDetails(uid);

        if (!status.found) {
            return res.json({
                success: false,
                error: "User not found"
            });
        }

        // Only mark revealed if reveal time has passed
        if (status.isRevealTime && status.hasMatch && !status.matchRevealed) {
            await markUserRevealed(uid);
            status.matchRevealed = true;
        }

        return res.json({
            success: true,
            uid,
            revealed: status.matchRevealed,
            isRevealTime: status.isRevealTime,
            matchId: status.matchId,
            matchData: status.matchData
        });

    } catch (e) {
        console.error("Reveal route error:", e);
        return res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

module.exports = router;
