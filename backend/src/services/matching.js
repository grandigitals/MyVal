// =====================================================
// MY VAL BACKEND - Matching Service
// Backend-only matching with fallback tiers
// =====================================================

const firebaseService = require("./firebase");

// Configuration
const AGE_RANGE_STRICT = 5;  // Tier 1: ±5 years
const AGE_RANGE_RELAXED = 10; // Tier 2: ±10 years

// TEST_MODE only affects NEW matches
const TEST_MODE = String(process.env.TEST_MODE || "false").toLowerCase() === "true";

// Production reveal date (Nigeria GMT+1)
const PROD_REVEAL_ISO = process.env.PROD_REVEAL_ISO || "2026-02-10T00:00:00+01:00";

// Get reveal config for external use
function getRevealConfig() {
    return {
        testMode: TEST_MODE,
        revealAtMs: TEST_MODE
            ? Date.now() + 2 * 60 * 1000  // 2 mins for testing
            : new Date(PROD_REVEAL_ISO).getTime(),
        prodRevealISO: PROD_REVEAL_ISO
    };
}

function getRevealAtMsForNewMatch() {
    return getRevealConfig().revealAtMs;
}

function norm(str) {
    return (str || "").toString().trim().toLowerCase();
}

// =====================================================
// Main matching function - tries multiple tiers
// =====================================================
async function runMatchingForUser(userId) {
    try {
        console.log(`\n🔍 [MATCH] Starting matchmaking for userId=${userId}`);

        const user = await firebaseService.getUser(userId);
        if (!user) {
            console.log(`❌ [MATCH] User not found: ${userId}`);
            return { matched: false, error: "User not found" };
        }

        // Already matched?
        if (user.matchId) {
            console.log(`ℹ️ [MATCH] Already matched. matchId=${user.matchId}`);
            return { matched: true, matchId: user.matchId, alreadyMatched: true };
        }

        // Must be paid
        const isPaid = user.paymentStatus === "paid" || user.is_premium === true;
        if (!isPaid) {
            console.log(`❌ [MATCH] User not paid: ${userId}`);
            return { matched: false, error: "User has not paid" };
        }

        // Get all paid unmatched candidates
        const candidates = await firebaseService.getPaidUnmatchedUsers();
        console.log(`📋 [MATCH] Total candidates: ${candidates.length}`);

        // Exclude self
        const validCandidates = candidates.filter(c => c.id && c.id !== userId);
        console.log(`📋 [MATCH] Valid candidates (excluding self): ${validCandidates.length}`);

        // Try matching with fallback tiers
        let match = null;
        let tier = 0;

        // Tier 1: Strict (same city + gender + age ±5)
        match = findBestMatch(user, validCandidates, {
            strictCity: true,
            maxAgeDiff: AGE_RANGE_STRICT
        });
        if (match) {
            tier = 1;
            console.log(`✅ [MATCH] Tier 1 match found: score=${match.score}`);
        }

        // Tier 2: Relaxed (same city + gender, no age limit)
        if (!match) {
            match = findBestMatch(user, validCandidates, {
                strictCity: true,
                maxAgeDiff: null // No age restriction
            });
            if (match) {
                tier = 2;
                console.log(`✅ [MATCH] Tier 2 match found: score=${match.score}`);
            }
        }

        // Tier 3: Wider (any city + gender match)
        if (!match) {
            match = findBestMatch(user, validCandidates, {
                strictCity: false,
                maxAgeDiff: null
            });
            if (match) {
                tier = 3;
                console.log(`✅ [MATCH] Tier 3 match found: score=${match.score}`);
            }
        }

        // No match found in any tier
        if (!match) {
            console.log(`⏳ [MATCH] No compatible match yet for userId=${userId}`);
            return { matched: false, message: "No compatible match found yet" };
        }

        // Create the match
        const revealAt = getRevealAtMsForNewMatch();
        const ok = await firebaseService.setMatch(userId, match.user.id, {
            revealAt,
            testMode: TEST_MODE,
            matchTier: tier
        });

        if (!ok) {
            console.log(`❌ [MATCH] Failed to save match`);
            return { matched: false, error: "Failed to save match" };
        }

        console.log(`💕 [MATCH] SUCCESS: ${userId} <-> ${match.user.id}`);
        console.log(`   Tier: ${tier}, Score: ${match.score}`);
        console.log(`   RevealAt: ${new Date(revealAt).toISOString()}, TestMode: ${TEST_MODE}`);

        return {
            matched: true,
            matchId: match.user.id,
            score: match.score,
            tier,
            revealAt,
            testMode: TEST_MODE
        };

    } catch (e) {
        console.error("🔥 [MATCH] Error:", e);
        return { matched: false, error: e.message };
    }
}

// =====================================================
// Find best match with configurable constraints
// =====================================================
function findBestMatch(user, candidates, options = {}) {
    const { strictCity = true, maxAgeDiff = null } = options;

    const scored = candidates
        .map(candidate => ({
            user: candidate,
            score: calculateCompatibilityScore(user, candidate, { strictCity, maxAgeDiff })
        }))
        .filter(x => x.score > 0)
        .sort((a, b) => {
            // Sort by score descending
            if (b.score !== a.score) return b.score - a.score;
            // Randomize for fairness when scores are equal
            return Math.random() - 0.5;
        });

    return scored.length > 0 ? scored[0] : null;
}

// =====================================================
// Calculate compatibility score
// =====================================================
function calculateCompatibilityScore(user1, user2, options = {}) {
    const { strictCity = true, maxAgeDiff = null } = options;
    let score = 0;

    // City matching
    const city1 = norm(user1.city);
    const city2 = norm(user2.city);

    if (strictCity) {
        // Same city required
        if (!city1 || !city2 || city1 !== city2) return 0;
        score += 40;
    } else {
        // City not required, but bonus if same
        if (city1 && city2 && city1 === city2) {
            score += 40;
        } else {
            score += 10; // Base score for different city
        }
    }

    // Gender preference (always required)
    const gender1 = norm(user1.gender);
    const gender2 = norm(user2.gender);
    const pref1 = norm(user1.genderPreference || "any");
    const pref2 = norm(user2.genderPreference || "any");

    const ok1 = pref1 === "any" || pref1 === gender2;
    const ok2 = pref2 === "any" || pref2 === gender1;

    if (!ok1 || !ok2) return 0; // Gender must match
    score += 40;

    // Age compatibility
    const age1 = calculateAge(user1.dateOfBirth);
    const age2 = calculateAge(user2.dateOfBirth);

    if (age1 && age2) {
        const diff = Math.abs(age1 - age2);

        if (maxAgeDiff !== null && diff > maxAgeDiff) {
            return 0; // Age difference too large for this tier
        }

        // Bonus points for closer ages
        if (diff <= 2) score += 20;
        else if (diff <= 5) score += 15;
        else if (diff <= 10) score += 10;
        else score += 5;
    } else {
        // No DOB info - give base points
        score += 5;
    }

    return score;
}

// =====================================================
// Calculate age from date of birth
// =====================================================
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

// =====================================================
// Global matching for all unmatched users
// =====================================================
async function runGlobalMatching() {
    try {
        console.log("\n🌍 [MATCH] Running global matchmaking...");
        const users = await firebaseService.getPaidUnmatchedUsers();
        let matchesMade = 0;

        for (const u of users) {
            if (!u.id || u.matchId) continue;
            const result = await runMatchingForUser(u.id);
            if (result.matched && !result.alreadyMatched) matchesMade++;
        }

        console.log(`✅ [MATCH] Global matching complete. matchesMade=${matchesMade}`);
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
    getRevealConfig
};
