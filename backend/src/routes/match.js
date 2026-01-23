const express = require("express");
const { verifyFirebaseToken, markMatchRevealedIfDue, getUser } = require("../services/firebase");

const router = express.Router();

// GET /match/reveal  (auth required)
router.get("/reveal", async (req, res) => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({ success: false, error: "Missing Authorization Bearer token" });

        const decoded = await verifyFirebaseToken(token);
        const uid = decoded.uid;

        const result = await markMatchRevealedIfDue(uid);

        // return latest user snapshot too (useful for UI debug)
        const user = await getUser(uid);

        return res.json({
            success: true,
            uid,
            revealResult: result,
            user: user
                ? {
                    matchId: user.matchId || null,
                    matchRevealed: user.matchRevealed || false,
                    revealAt: user.revealAt?.toDate ? user.revealAt.toDate().toISOString() : null,
                    matchDocId: user.matchDocId || null,
                }
                : null,
        });
    } catch (e) {
        console.error("Reveal route error:", e);
        return res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
