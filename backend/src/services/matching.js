// =====================================================
// MY VAL BACKEND - Matching Service (AUTO + TEST_MODE)
// =====================================================

const firebaseService = require("./firebase");

const AGE_RANGE = 5;

function norm(str) {
    return (str || "").toString().trim().toLowerCase();
}

async function runMatchingForUser(userId) {
    try {
        console.log(`\n🔍 [MATCH] Start matchmaking userId=${userId}`);

        const user = await firebaseService.getUser(userId);
        if (!user) return { matched: false, error: "User not found" };

        if (user.matchId) {
            console.log(`ℹ️ [MATCH] Already matched matchId=${user.matchId}`);
            return { matched: true, matchId: user.matchId, message: "Already matched" };
        }

        const isPaid = user.paymentStatus === "paid" || user.is_premium === true;
        if (!isPaid) return { matched: false, error: "User has not paid" };

        const candidates = await firebaseService.getPaidUnmatchedUsers();
        console.log(`📋 [MATCH] Candidates=${candidates.length}`);

        const userCity = norm(user.city);
        console.log(`🏙️ [MATCH] userCity="${userCity}"`);

        const match = findBestMatch(userId, user, candidates);
        if (!match) {
            console.log(`⏳ [MATCH] No compatible match found yet for ${userId}`);
            return { matched: false, message: "No compatible match found yet" };
        }

        const revealAtMs = firebaseService.computeRevealAtMs();

        const saved = await firebaseService.setMatch(userId, match.user.id, {
            revealAtMs,
            testMode: firebaseService.isTestMode(),
        });

        if (!saved.ok) {
            console.log(`❌ [MATCH] setMatch failed: ${saved.error}`);
            return { matched: false, error: "Failed to save match" };
        }

        console.log(`💕 [MATCH] Matched OK: ${userId} <-> ${match.user.id}`);
        console.log(`⏰ [MATCH] revealAt=${new Date(saved.revealAtMs).toISOString()} TEST_MODE=${firebaseService.isTestMode()}`);

        return {
            matched: true,
            matchId: match.user.id,
            matchDocId: saved.matchDocId,
            score: match.score,
            revealAtMs: saved.revealAtMs,
        };
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

    if (!scored.length) return null;

    console.log(`✅ [MATCH] Top score=${scored[0].score} candidateId=${scored[0].user.id}`);
    return scored[0];
}

function calculateCompatibilityScore(user1, user2) {
    let score = 0;

    // City must match
    const city1 = norm(user1.city);
    const city2 = norm(user2.city);
    if (!city1 || !city2 || city1 !== city2) return 0;
    score += 40;

    // Gender prefs
    const gender1 = norm(user1.gender);
    const gender2 = norm(user2.gender);
    const pref1 = norm(user1.genderPreference || "any");
    const pref2 = norm(user2.genderPreference || "any");

    const ok1 = pref1 === "any" || pref1 === gender2;
    const ok2 = pref2 === "any" || pref2 === gender1;
    if (!ok1 || !ok2) return 0;
    score += 40;

    // Age bonus (optional)
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

async function runGlobalMatching() {
    try {
        console.log("\n🌍 [MATCH] Running global matchmaking...");
        const users = await firebaseService.getPaidUnmatchedUsers();
        let matchesMade = 0;

        for (const u of users) {
            if (!u.id || u.matchId) continue;
            const r = await runMatchingForUser(u.id);
            if (r.matched) matchesMade++;
        }

        console.log(`✅ [MATCH] Global matching complete matchesMade=${matchesMade}`);
        return { matchesMade };
    } catch (e) {
        console.error("🔥 [MATCH] Global matching error:", e);
        return { error: e.message };
    }
}

module.exports = {
    runMatchingForUser,
    runGlobalMatching,
    calculateCompatibilityScore,
};
