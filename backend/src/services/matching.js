// =====================================================
// MY VAL BACKEND - Matching Service (Prod Feb 10 + optional TEST_MODE)
// =====================================================

const firebaseService = require("./firebase");

const AGE_RANGE = 5;

// TEST_MODE only affects NEW matches
const TEST_MODE = String(process.env.TEST_MODE || "false").toLowerCase() === "true";

// Feb 10 reveal time (GMT+1)
const PROD_REVEAL_ISO = process.env.PROD_REVEAL_ISO || "2026-02-10T00:00:00+01:00";

function getRevealAtMsForNewMatch() {
    if (TEST_MODE) return Date.now() + 2 * 60 * 1000; // 2 mins (testing)
    return new Date(PROD_REVEAL_ISO).getTime(); // production
}

function norm(str) {
    return (str || "").toString().trim().toLowerCase();
}

async function runMatchingForUser(userId) {
    try {
        console.log(`\n🔍 [MATCH] Run matchmaking for userId=${userId}`);

        const user = await firebaseService.getUser(userId);
        if (!user) return { matched: false, error: "User not found" };

        if (user.matchId) {
            console.log(`ℹ️ [MATCH] Already matched. matchId=${user.matchId}`);
            return { matched: true, matchId: user.matchId };
        }

        const isPaid = user.paymentStatus === "paid" || user.is_premium === true;
        if (!isPaid) return { matched: false, error: "User has not paid" };

        const candidates = await firebaseService.getPaidUnmatchedUsers();
        console.log(`📋 [MATCH] candidates=${candidates.length}`);

        const match = findBestMatch(userId, user, candidates);
        if (!match) {
            console.log(`⏳ [MATCH] No compatible match yet for userId=${userId}`);
            return { matched: false, message: "No compatible match found yet" };
        }

        const revealAt = getRevealAtMsForNewMatch();

        const ok = await firebaseService.setMatch(userId, match.user.id, {
            revealAt,
            testMode: TEST_MODE,
        });

        if (!ok) return { matched: false, error: "Failed to save match" };

        console.log(`💕 [MATCH] Matched OK: ${userId} <-> ${match.user.id}`);
        console.log(`⏰ [MATCH] revealAt=${new Date(revealAt).toISOString()} testMode=${TEST_MODE}`);

        return { matched: true, matchId: match.user.id, score: match.score, revealAt };
    } catch (e) {
        console.error("🔥 [MATCH] Error:", e);
        return { matched: false, error: e.message };
    }
}

function findBestMatch(userId, user, candidates) {
    const scored = candidates
        .filter((c) => c.id && c.id !== userId)
        .map((candidate) => ({
            user: candidate,
            score: calculateCompatibilityScore(user, candidate),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);

    return scored.length ? scored[0] : null;
}

function calculateCompatibilityScore(user1, user2) {
    let score = 0;

    // City must match
    const city1 = norm(user1.city);
    const city2 = norm(user2.city);
    if (!city1 || !city2 || city1 !== city2) return 0;
    score += 40;

    // Gender preference
    const gender1 = norm(user1.gender);
    const gender2 = norm(user2.gender);
    const pref1 = norm(user1.genderPreference || "any");
    const pref2 = norm(user2.genderPreference || "any");

    const ok1 = pref1 === "any" || pref1 === gender2;
    const ok2 = pref2 === "any" || pref2 === gender1;
    if (!ok1 || !ok2) return 0;
    score += 40;

    // Age
    const age1 = calculateAge(user1.dateOfBirth);
    const age2 = calculateAge(user2.dateOfBirth);
    if (age1 && age2) {
        const diff = Math.abs(age1 - age2);
        if (diff <= 2) score += 20;
        else if (diff <= AGE_RANGE) score += 10;
    }

    return score;
}

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    if (isNaN(birth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

module.exports = { runMatchingForUser, calculateCompatibilityScore };
