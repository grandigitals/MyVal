// =====================================================
// MY VAL BACKEND - Matching Service (FIXED + TEST_MODE)
// =====================================================

const firebaseService = require("./firebase");

// Matching configuration
const AGE_RANGE = 5; // Match within ± years

// TEST MODE (set in Render env vars)
// TEST_MODE=true -> revealAt = now + 2 mins
const TEST_MODE = String(process.env.TEST_MODE || "false").toLowerCase() === "true";

// Production reveal date (Nigeria is GMT+1)
// Change year if needed
const PROD_REVEAL_ISO = process.env.PROD_REVEAL_ISO || "2026-02-10T00:00:00+01:00";

function getRevealAtMs() {
    if (TEST_MODE) {
        return Date.now() + 2 * 60 * 1000; // 2 minutes
    }
    return new Date(PROD_REVEAL_ISO).getTime();
}

function norm(str) {
    return (str || "").toString().trim().toLowerCase();
}

/**
 * Run matchmaking for a specific user (AUTO CALLED AFTER PAYMENT VERIFY)
 */
async function runMatchingForUser(userId) {
    try {
        console.log(`\n🔍 [MATCH] Start matchmaking for userId=${userId}`);

        // Get user data
        const user = await firebaseService.getUser(userId);

        if (!user) {
            console.log(`❌ [MATCH] User not found: ${userId}`);
            return { matched: false, error: "User not found" };
        }

        // Already matched
        if (user.matchId) {
            console.log(`ℹ️ [MATCH] User already matched. matchId=${user.matchId}`);
            return { matched: true, message: "User already has a match", matchId: user.matchId };
        }

        // Must be paid
        const isPaid = user.paymentStatus === "paid" || user.is_premium === true;
        if (!isPaid) {
            console.log(`❌ [MATCH] User not paid. paymentStatus=${user.paymentStatus}, is_premium=${user.is_premium}`);
            return { matched: false, error: "User has not paid" };
        }

        // Get candidates (paid + unmatched)
        const candidates = await firebaseService.getPaidUnmatchedUsers();
        console.log(`📋 [MATCH] Candidates fetched: ${candidates.length}`);

        // Useful debug counts
        const userCity = norm(user.city);
        const sameCityCount = candidates.filter(c => norm(c.city) === userCity && c.id !== userId).length;
        console.log(`🏙️ [MATCH] userCity="${userCity}" | sameCityCandidates=${sameCityCount}`);

        // Find best match
        const match = findBestMatch(userId, user, candidates);

        if (!match) {
            console.log(`⏳ [MATCH] No compatible match found for userId=${userId} (yet).`);
            return { matched: false, message: "No compatible match found yet" };
        }

        // Create the match (IMPORTANT: use userId, not user.id)
        const revealAt = getRevealAtMs();
        const ok = await firebaseService.setMatch(userId, match.user.id, {
            revealAt,
            testMode: TEST_MODE
        });

        if (!ok) {
            console.log(`❌ [MATCH] setMatch failed for ${userId} <-> ${match.user.id}`);
            return { matched: false, error: "Failed to save match" };
        }

        console.log(`💕 [MATCH] Matched OK: ${userId} <-> ${match.user.id}`);
        console.log(`⏰ [MATCH] revealAt=${new Date(revealAt).toISOString()} testMode=${TEST_MODE}`);

        return {
            matched: true,
            matchId: match.user.id,
            matchName: match.user.fullName || match.user.email || "Unknown",
            score: match.score,
            revealAt
        };
    } catch (error) {
        console.error("🔥 [MATCH] Error:", error);
        return { matched: false, error: error.message };
    }
}

/**
 * Find the best match for a user from candidates
 */
function findBestMatch(userId, user, candidates) {
    const scoredCandidates = candidates
        .filter(c => c.id && c.id !== userId) // Exclude self + ensure candidate has id
        .map(candidate => ({
            user: candidate,
            score: calculateCompatibilityScore(user, candidate)
        }))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score);

    if (scoredCandidates.length === 0) return null;

    console.log(`✅ [MATCH] Top candidate score=${scoredCandidates[0].score} candidateId=${scoredCandidates[0].user.id}`);
    return scoredCandidates[0];
}

/**
 * Compatibility score between two users
 */
function calculateCompatibilityScore(user1, user2) {
    let score = 0;

    // City MUST match (strict)
    const city1 = norm(user1.city);
    const city2 = norm(user2.city);

    if (!city1 || !city2 || city1 !== city2) {
        return 0;
    }
    score += 40;

    // Gender preference match
    const gender1 = norm(user1.gender);
    const gender2 = norm(user2.gender);
    const pref1 = norm(user1.genderPreference || "any");
    const pref2 = norm(user2.genderPreference || "any");

    const user1AcceptsUser2 = pref1 === "any" || pref1 === gender2;
    const user2AcceptsUser1 = pref2 === "any" || pref2 === gender1;

    if (!user1AcceptsUser2 || !user2AcceptsUser1) {
        return 0;
    }
    score += 40;

    // Age compatibility
    const age1 = calculateAge(user1.dateOfBirth);
    const age2 = calculateAge(user2.dateOfBirth);

    if (age1 && age2) {
        const ageDiff = Math.abs(age1 - age2);
        if (ageDiff <= 2) score += 20;
        else if (ageDiff <= AGE_RANGE) score += 10;
    } else {
        // If DOB missing, don't block matching (just no bonus)
        // (optional) score += 0;
    }

    return score;
}

/**
 * Calculate age from dateOfBirth (string or timestamp)
 */
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

/**
 * Global matching (optional: can run periodically)
 */
async function runGlobalMatching() {
    try {
        console.log("\n🌍 [MATCH] Running global matchmaking...");

        const users = await firebaseService.getPaidUnmatchedUsers();
        let matchesMade = 0;

        for (const u of users) {
            if (!u.id) continue;
            if (u.matchId) continue;

            const result = await runMatchingForUser(u.id);
            if (result.matched) matchesMade++;
        }

        console.log(`✅ [MATCH] Global matching complete. matchesMade=${matchesMade}`);
        return { matchesMade };
    } catch (error) {
        console.error("🔥 [MATCH] Global matching error:", error);
        return { error: error.message };
    }
}

module.exports = {
    runMatchingForUser,
    runGlobalMatching,
    calculateCompatibilityScore
};
