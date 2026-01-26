// =====================================================
// MY VAL BACKEND - Promo Routes (Influencer Tracking)
// =====================================================

const express = require("express");
const { getAdminDb } = require("../services/firebase");

const router = express.Router();

// GET /promo/stats - Get all promo codes and their stats
router.get("/stats", async (req, res) => {
    try {
        const db = getAdminDb();
        const snapshot = await db.collection("promos").get();

        const promos = [];
        snapshot.forEach(doc => {
            promos.push({
                code: doc.id,
                ...doc.data()
            });
        });

        // Sort by paid signups descending
        promos.sort((a, b) => (b.paidSignups || 0) - (a.paidSignups || 0));

        return res.json({
            success: true,
            totalPromos: promos.length,
            promos
        });
    } catch (err) {
        console.error("Promo stats error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// GET /promo/:code - Get stats for a specific promo code
router.get("/:code", async (req, res) => {
    try {
        const code = req.params.code.toLowerCase();
        const db = getAdminDb();

        const doc = await db.collection("promos").doc(code).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Promo code not found" });
        }

        return res.json({
            success: true,
            code,
            ...doc.data()
        });
    } catch (err) {
        console.error("Promo get error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
