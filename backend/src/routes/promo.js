// =====================================================
// MY VAL BACKEND - Referral Routes (Influencer Tracking)
// =====================================================

const express = require("express");
const { getAdminDb } = require("../services/firebase");

const router = express.Router();

// GET /promo/stats - Get all referral codes and their stats (admin only)
router.get("/stats", async (req, res) => {
    try {
        const db = getAdminDb();
        const snapshot = await db.collection("referrals").get();

        const referrals = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            referrals.push({
                code: doc.id,
                name: data.name || doc.id,
                paidSignups: data.paidSignups || 0,
                totalSignups: data.totalSignups || 0,
                createdAt: data.createdAt,
                lastPaidAt: data.lastPaidAt
            });
        });

        // Sort by paid signups descending
        referrals.sort((a, b) => (b.paidSignups || 0) - (a.paidSignups || 0));

        return res.json({
            success: true,
            totalReferrals: referrals.length,
            referrals
        });
    } catch (err) {
        console.error("Referral stats error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /promo/verify - Verify influencer access with PIN
router.post("/verify", async (req, res) => {
    try {
        const { code, pin } = req.body;

        if (!code || !pin) {
            return res.status(400).json({ success: false, error: "Code and PIN required" });
        }

        const db = getAdminDb();
        const doc = await db.collection("referrals").doc(code.toLowerCase()).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Referral code not found" });
        }

        const data = doc.data();

        // Check PIN
        if (data.pin !== pin) {
            return res.status(401).json({ success: false, error: "Invalid PIN" });
        }

        // Return stats
        return res.json({
            success: true,
            code: doc.id,
            name: data.name || doc.id,
            paidSignups: data.paidSignups || 0,
            totalSignups: data.totalSignups || 0,
            createdAt: data.createdAt,
            lastPaidAt: data.lastPaidAt
        });
    } catch (err) {
        console.error("Referral verify error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// GET /promo/:code - Get stats for a specific referral code (public view - limited info)
router.get("/:code", async (req, res) => {
    try {
        const code = req.params.code.toLowerCase();
        const db = getAdminDb();

        const doc = await db.collection("referrals").doc(code).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Referral code not found" });
        }

        const data = doc.data();

        return res.json({
            success: true,
            code,
            name: data.name || code,
            exists: true
            // Don't expose stats without PIN auth
        });
    } catch (err) {
        console.error("Referral get error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
