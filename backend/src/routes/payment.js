const express = require("express");
const { getAdminDb, verifyFirebaseToken } = require("../services/firebase");
const matchingService = require("../services/matching");

const router = express.Router();

// GET /pay/verify?reference=...
router.get("/verify", async (req, res) => {
    try {
        const reference = req.query.reference;
        if (!reference) return res.status(400).json({ success: false, error: "Missing reference" });

        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({ success: false, error: "Missing Authorization Bearer token" });

        const decoded = await verifyFirebaseToken(token);
        const uid = decoded.uid;

        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return res.status(500).json({ success: false, error: "PAYSTACK_SECRET_KEY not set" });

        const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            headers: { Authorization: `Bearer ${secret}` },
        });

        const result = await r.json();

        if (!result.status) {
            return res.status(400).json({ success: false, error: result.message || "Paystack verification failed" });
        }

        const data = result.data;

        if (data.status !== "success") {
            return res.status(400).json({ success: false, error: "Payment not successful", paystackStatus: data.status });
        }

        const expectedAmount = 50000;
        if (data.amount !== expectedAmount || data.currency !== "NGN") {
            return res.status(400).json({ success: false, error: "Invalid payment amount/currency" });
        }

        const db = getAdminDb();

        await db.collection("users").doc(uid).set(
            {
                is_premium: true,
                paymentStatus: "paid",
                paymentRef: reference,
                paidAt: new Date().toISOString(),
                paystack: {
                    channel: data.channel || null,
                    gateway_response: data.gateway_response || null,
                    customer_email: data.customer?.email || null,
                },
            },
            { merge: true }
        );

        console.log(`✅ User ${uid} marked as paid`);

        // Track referral code if user has one
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();
        if (userData?.refCode) {
            const refRef = db.collection("referrals").doc(userData.refCode.toLowerCase());
            const refDoc = await refRef.get();

            if (refDoc.exists) {
                // Increment paid signups count
                await refRef.update({
                    paidSignups: (refDoc.data().paidSignups || 0) + 1,
                    lastPaidAt: new Date().toISOString()
                });
                console.log(`📊 Referral "${userData.refCode}" incremented paidSignups`);
            } else {
                console.log(`⚠️ Referral code "${userData.refCode}" not found in referrals collection`);
            }
        }

        // Auto match after payment
        let matchResult = { matched: false };
        try {
            matchResult = await matchingService.runMatchingForUser(uid);
            console.log(`💕 Matching result for ${uid}:`, matchResult);
        } catch (e) {
            console.error("Matching error (non-fatal):", e);
        }

        return res.json({
            success: true,
            reference,
            uid,
            matchFound: matchResult.matched || false,
            matchId: matchResult.matchId || null,
            matchDocId: matchResult.matchDocId || null,
            revealAtMs: matchResult.revealAtMs || null,
        });
    } catch (err) {
        console.error("Verify error:", err);
        return res.status(500).json({ success: false, error: "Internal server error", message: err.message });
    }
});

router.post("/run-matching", async (req, res) => {
    try {
        const result = await matchingService.runGlobalMatching();
        return res.json({ success: true, ...result });
    } catch (err) {
        console.error("Global matching error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
