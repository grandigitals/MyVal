// =====================================================
// MY VAL BACKEND - Referral Routes (Influencer Tracking)
// =====================================================

const express = require("express");
const { getAdminDb } = require("../services/firebase");

const router = express.Router();

// Earnings per paid signup (20% of ₦500)
const EARNINGS_PER_SIGNUP = 100;

// Admin email for payout management
const ADMIN_EMAIL = "danielaleriwa@gmail.com";

// Helper: Calculate earnings data
function calculateEarnings(data) {
    const paidSignups = data.paidSignups || 0;
    const totalEarnings = paidSignups * EARNINGS_PER_SIGNUP;
    const amountPaidOut = data.amountPaidOut || 0;
    const pendingBalance = totalEarnings - amountPaidOut;

    return {
        paidSignups,
        totalEarnings,
        amountPaidOut,
        pendingBalance,
        payoutRequested: data.payoutRequested || false,
        payoutRequestedAt: data.payoutRequestedAt || null
    };
}

// GET /promo/stats - Get all referral codes and their stats (admin only)
router.get("/stats", async (req, res) => {
    try {
        const db = getAdminDb();
        const snapshot = await db.collection("referrals").get();

        const referrals = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const earnings = calculateEarnings(data);
            referrals.push({
                code: doc.id,
                name: data.name || doc.id,
                paidSignups: data.paidSignups || 0,
                totalSignups: data.totalSignups || 0,
                ...earnings,
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

        // Check PIN (convert to string for comparison in case Firestore stores as number)
        if (String(data.pin) !== String(pin)) {
            return res.status(401).json({ success: false, error: "Invalid PIN" });
        }

        // Calculate earnings
        const earnings = calculateEarnings(data);

        // Return stats with earnings
        return res.json({
            success: true,
            code: doc.id,
            name: data.name || doc.id,
            totalSignups: data.totalSignups || 0,
            ...earnings,
            payoutHistory: data.payoutHistory || [],
            createdAt: data.createdAt,
            lastPaidAt: data.lastPaidAt
        });
    } catch (err) {
        console.error("Referral verify error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /promo/request-payout - Partner requests a payout
router.post("/request-payout", async (req, res) => {
    try {
        const { code, pin } = req.body;

        if (!code || !pin) {
            return res.status(400).json({ success: false, error: "Code and PIN required" });
        }

        const db = getAdminDb();
        const refRef = db.collection("referrals").doc(code.toLowerCase());
        const doc = await refRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Referral code not found" });
        }

        const data = doc.data();

        // Verify PIN
        if (String(data.pin) !== String(pin)) {
            return res.status(401).json({ success: false, error: "Invalid PIN" });
        }

        // Check if already requested
        if (data.payoutRequested) {
            return res.status(400).json({ success: false, error: "Payout already requested" });
        }

        // Check if has pending balance
        const earnings = calculateEarnings(data);
        if (earnings.pendingBalance <= 0) {
            return res.status(400).json({ success: false, error: "No pending balance to request" });
        }

        // Mark payout as requested
        await refRef.update({
            payoutRequested: true,
            payoutRequestedAt: new Date().toISOString(),
            payoutRequestedAmount: earnings.pendingBalance
        });

        console.log(`💰 Payout requested for "${code}" - ₦${earnings.pendingBalance}`);

        return res.json({
            success: true,
            message: "Payout requested successfully",
            requestedAmount: earnings.pendingBalance
        });
    } catch (err) {
        console.error("Request payout error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /promo/track-signup - Track a signup for a referral code
router.post("/track-signup", async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, error: "Referral code required" });
        }

        const db = getAdminDb();
        const refRef = db.collection("referrals").doc(code.toLowerCase());
        const refDoc = await refRef.get();

        if (refDoc.exists) {
            // Increment total signups count
            await refRef.update({
                totalSignups: (refDoc.data().totalSignups || 0) + 1,
                lastSignupAt: new Date().toISOString()
            });
            console.log(`📊 Referral "${code}" incremented totalSignups`);
            return res.json({ success: true, message: "Signup tracked" });
        } else {
            console.log(`⚠️ Referral code "${code}" not found`);
            return res.json({ success: false, error: "Referral code not found" });
        }
    } catch (err) {
        console.error("Track signup error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

// GET /promo/admin/partners - Get all partners with payout info (admin only)
router.get("/admin/partners", async (req, res) => {
    try {
        const { email } = req.query;

        // Verify admin email
        if (email !== ADMIN_EMAIL) {
            return res.status(403).json({ success: false, error: "Unauthorized" });
        }

        const db = getAdminDb();
        const snapshot = await db.collection("referrals").get();

        const partners = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const earnings = calculateEarnings(data);
            partners.push({
                code: doc.id,
                name: data.name || doc.id,
                ...earnings,
                payoutHistory: data.payoutHistory || [],
                bankName: data.bankName || "",
                accountNumber: data.accountNumber || "",
                accountName: data.accountName || ""
            });
        });

        // Sort by pending balance descending (who needs to be paid first)
        partners.sort((a, b) => {
            // Prioritize those with payout requests
            if (a.payoutRequested && !b.payoutRequested) return -1;
            if (!a.payoutRequested && b.payoutRequested) return 1;
            return b.pendingBalance - a.pendingBalance;
        });

        return res.json({
            success: true,
            totalPartners: partners.length,
            partners
        });
    } catch (err) {
        console.error("Admin partners error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /promo/admin/mark-paid - Mark a payout as complete
router.post("/admin/mark-paid", async (req, res) => {
    try {
        const { email, code, amount, note } = req.body;

        // Verify admin email
        if (email !== ADMIN_EMAIL) {
            return res.status(403).json({ success: false, error: "Unauthorized" });
        }

        if (!code || !amount) {
            return res.status(400).json({ success: false, error: "Code and amount required" });
        }

        const db = getAdminDb();
        const refRef = db.collection("referrals").doc(code.toLowerCase());
        const doc = await refRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: "Partner not found" });
        }

        const data = doc.data();
        const currentPaidOut = data.amountPaidOut || 0;
        const payoutHistory = data.payoutHistory || [];

        // Add to payout history
        payoutHistory.push({
            amount: Number(amount),
            paidAt: new Date().toISOString(),
            note: note || ""
        });

        // Update document
        await refRef.update({
            amountPaidOut: currentPaidOut + Number(amount),
            payoutRequested: false,
            payoutRequestedAt: null,
            payoutRequestedAmount: null,
            payoutHistory,
            lastPayoutAt: new Date().toISOString()
        });

        console.log(`✅ Admin marked ₦${amount} paid to "${code}"`);

        return res.json({
            success: true,
            message: `₦${amount} marked as paid to ${data.name || code}`,
            newTotalPaidOut: currentPaidOut + Number(amount)
        });
    } catch (err) {
        console.error("Mark paid error:", err);
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
