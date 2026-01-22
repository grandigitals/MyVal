// =====================================================
// MY VAL BACKEND - Matching Service
// =====================================================

const firebaseService = require('./firebase');

// Matching configuration
const AGE_RANGE = 5; // Match within ± years

/**
 * Run matchmaking for a specific user
 */
async function runMatchingForUser(userId) {
    try {
        console.log(`🔍 Running matchmaking for user: ${userId}`);

        // Get user data
        const user = await firebaseService.getUser(userId);

        if (!user) {
            return { matched: false, error: 'User not found' };
        }

        if (user.matchId) {
            return { matched: true, message: 'User already has a match', matchId: user.matchId };
        }

        if (user.paymentStatus !== 'paid' && !user.is_premium) {
            return { matched: false, error: 'User has not paid' };
        }

        // Get all paid unmatched users
        const candidates = await firebaseService.getPaidUnmatchedUsers();
        console.log(`📋 Found ${candidates.length} potential matches`);

        // Find best match
        const match = findBestMatch(user, candidates);

        if (match) {
            // Create the match
            const success = await firebaseService.setMatch(user.id, match.user.id);

            if (success) {
                console.log(`💕 Matched: ${user.fullName || user.email} <-> ${match.user.fullName || match.user.email}`);
                return {
                    matched: true,
                    matchId: match.user.id,
                    matchName: match.user.fullName,
                    score: match.score
                };
            }
        }

        console.log(`⏳ No match found for user ${userId} - will match when more users join`);
        return { matched: false, message: 'No compatible match found yet' };

    } catch (error) {
        console.error('Matching error:', error);
        return { matched: false, error: error.message };
    }
}

/**
 * Find the best match for a user from candidates
 */
function findBestMatch(user, candidates) {
    const scoredCandidates = candidates
        .filter(c => c.id !== user.id) // Exclude self
        .map(candidate => ({
            user: candidate,
            score: calculateCompatibilityScore(user, candidate)
        }))
        .filter(c => c.score > 0) // Only compatible matches
        .sort((a, b) => b.score - a.score); // Sort by highest score

    return scoredCandidates.length > 0 ? scoredCandidates[0] : null;
}

/**
 * Calculate compatibility score between two users
 */
function calculateCompatibilityScore(user1, user2) {
    let score = 0;

    // Same city is required (40 points)
    const city1 = (user1.city || '').toLowerCase().trim();
    const city2 = (user2.city || '').toLowerCase().trim();

    if (!city1 || !city2 || city1 !== city2) {
        return 0; // Must be same city
    }
    score += 40;

    // Gender preference match (40 points)
    const gender1 = (user1.gender || '').toLowerCase();
    const gender2 = (user2.gender || '').toLowerCase();
    const pref1 = (user1.genderPreference || 'any').toLowerCase();
    const pref2 = (user2.genderPreference || 'any').toLowerCase();

    // Check if each user accepts the other's gender
    const user1AcceptsUser2 = pref1 === 'any' || pref1 === gender2;
    const user2AcceptsUser1 = pref2 === 'any' || pref2 === gender1;

    if (!user1AcceptsUser2 || !user2AcceptsUser1) {
        return 0; // Gender preferences must match
    }
    score += 40;

    // Age compatibility (20 points)
    const age1 = calculateAge(user1.dateOfBirth);
    const age2 = calculateAge(user2.dateOfBirth);

    if (age1 && age2) {
        const ageDiff = Math.abs(age1 - age2);
        if (ageDiff <= 2) {
            score += 20;
        } else if (ageDiff <= AGE_RANGE) {
            score += 10;
        }
    }

    return score;
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;

    const birth = new Date(dateOfBirth);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * Run global matching for all unmatched users
 */
async function runGlobalMatching() {
    try {
        console.log('🌍 Running global matchmaking...');

        const unmatchedUsers = await firebaseService.getPaidUnmatchedUsers();
        let matchesMade = 0;

        for (const user of unmatchedUsers) {
            if (user.matchId) continue; // Skip if already matched

            const result = await runMatchingForUser(user.id);
            if (result.matched && result.matchId) {
                matchesMade++;
            }
        }

        console.log(`✅ Global matching complete. Made ${matchesMade} new matches.`);
        return { matchesMade };

    } catch (error) {
        console.error('Global matching error:', error);
        return { error: error.message };
    }
}

module.exports = {
    runMatchingForUser,
    runGlobalMatching,
    calculateCompatibilityScore
};
