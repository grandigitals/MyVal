const express = require("express");
const fetch = require("node-fetch");
const { getAdminDb, verifyFirebaseToken } = require("../services/firebase");
const matchingService = require("../services/matching");

const router = express.Router();

// GET /pay/verify?reference=...
router.get("/verify", async (req, res) => {
    try {
        const reference = req.query.reference;
        if (!reference) {
            return res.status(400).json({ success: false, error: "Missing reference" });
        }

        // 1) Verify Firebase user (so we know which uid to update)
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) {
            return res.status(401).json({ success: false, error: "Missing Authorization Bearer token" });
        }

        const decoded = await verifyFirebaseToken(token);
        const uid = decoded.uid;

        // 2) Verify with Paystack (server-side)
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            return res.status(500).json({ success: false, error: "PAYSTACK_SECRET_KEY not set" });
        }

        const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            headers: {
                Authorization: `Bearer ${secret}`
            }
        });

        const result = await r.json();

        if (!result.status) {
            return res.status(400).json({ success: false, error: result.message || "Paystack verification failed" });
        }

        const data = result.data;

        // Must be success
        if (data.status !== "success") {
            return res.status(400).json({ success: false, error: "Payment not successful", paystackStatus: data.status });
        }

        // Optional safety: enforce amount/currency
        // Paystack amount is in kobo
        const expectedAmount = 200000;
        if (data.amount !== expectedAmount || data.currency !== "NGN") {
            return res.status(400).json({ success: false, error: "Invalid payment amount/currency" });
        }

        // 3) Update Firestore - mark user as paid
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
                    customer_email: data.customer?.email || null
                }
            },
            { merge: true }
        );

        console.log(`✅ User ${uid} marked as paid`);

        // 4) *** RUN MATCHING *** - This was missing!
        let matchResult = { matched: false };
        try {
            matchResult = await matchingService.runMatchingForUser(uid);
            console.log(`💕 Matching result for ${uid}:`, matchResult);
        } catch (matchError) {
            console.error("Matching error (non-fatal):", matchError);
        }

        return res.json({
            success: true,
            reference,
            uid,
            matchFound: matchResult.matched,
            matchId: matchResult.matchId || null
        });

    } catch (err) {
        console.error("Verify error:", err);
        return res.status(500).json({ success: false, error: "Internal server error", message: err.message });
    }
});

// POST /pay/run-matching - Manual trigger for matching (admin use)
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
