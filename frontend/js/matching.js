// =====================================================
// MY VAL - AI Matching Module
// =====================================================

const Matching = {
    // Run matching for a specific user after payment
    runMatchingForUser(userId) {
        const user = Database.getUserById(userId);
        if (!user) return null;

        // User already matched
        if (user.matchId) return user.matchId;

        // Find best match
        const match = this.findBestMatch(user);

        if (match) {
            // Create the match in database
            Database.setMatch(user.id, match.id);
            console.log(`Match created: ${user.fullName} <-> ${match.fullName}`);
            return match.id;
        }

        console.log(`No match found for ${user.fullName} yet`);
        return null;
    },

    // Find the best match for a user
    findBestMatch(user) {
        // Get all paid, unmatched users except current user
        const candidates = Database.getPaidUnmatchedUsers()
            .filter(u => u.id !== user.id);

        if (candidates.length === 0) return null;

        // Score each candidate
        const scoredCandidates = candidates
            .map(candidate => ({
                user: candidate,
                score: this.calculateCompatibility(user, candidate)
            }))
            .filter(c => c.score > 0) // Must have minimum compatibility
            .sort((a, b) => b.score - a.score); // Sort by score descending

        // Return best match
        return scoredCandidates.length > 0 ? scoredCandidates[0].user : null;
    },

    // Calculate compatibility score between two users
    calculateCompatibility(user1, user2) {
        let score = 0;

        // 1. Gender Preference Match (REQUIRED - 50 points)
        if (!this.checkGenderPreferenceMatch(user1, user2)) {
            return 0; // Must have compatible preferences (opposite gender)
        }
        score += 50;

        // 2. Location Match (PREFERRED - 30 points for same state, still matchable if different)
        if (this.checkLocationMatch(user1, user2)) {
            score += 30; // Same state bonus
        }
        // Cross-state users still get matched but with lower priority

        // 3. Age Compatibility (PREFERRED - up to 20 points)
        const ageScore = this.calculateAgeScore(user1, user2);
        score += ageScore;

        return score;
    },

    // Check if users are in the same state
    checkLocationMatch(user1, user2) {
        return user1.city && user2.city &&
            user1.city.toLowerCase() === user2.city.toLowerCase();
    },

    // Check if gender preferences are compatible
    checkGenderPreferenceMatch(user1, user2) {
        // User1's preference matches User2's gender AND vice versa
        const user1AcceptsUser2 = this.prefersGender(user1.genderPreference, user2.gender);
        const user2AcceptsUser1 = this.prefersGender(user2.genderPreference, user1.gender);

        return user1AcceptsUser2 && user2AcceptsUser1;
    },

    // Check if preference matches gender
    prefersGender(preference, gender) {
        if (preference === 'any') return true;
        return preference === gender;
    },

    // Calculate age compatibility score
    calculateAgeScore(user1, user2) {
        const age1 = this.calculateAge(user1.dateOfBirth);
        const age2 = this.calculateAge(user2.dateOfBirth);

        if (!age1 || !age2) return 5; // No DOB info, give base points

        const ageDiff = Math.abs(age1 - age2);

        if (ageDiff <= 2) return 20;
        if (ageDiff <= 5) return 15;
        if (ageDiff <= 10) return 10;
        return 5;
    },

    // Calculate age from date of birth
    calculateAge(dateOfBirth) {
        if (!dateOfBirth) return null;
        const dob = new Date(dateOfBirth);
        if (isNaN(dob.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    },

    // Run matching for all unmatched paid users
    runGlobalMatching() {
        const unmatchedUsers = Database.getPaidUnmatchedUsers();
        let matchesCreated = 0;

        for (const user of unmatchedUsers) {
            if (!user.matchId) { // Re-check as matches may have been created
                const refreshedUser = Database.getUserById(user.id);
                if (!refreshedUser.matchId) {
                    const matchId = this.runMatchingForUser(user.id);
                    if (matchId) matchesCreated++;
                }
            }
        }

        console.log(`Global matching complete. ${matchesCreated} matches created.`);
        return matchesCreated;
    },

    // Get match status for display
    getMatchStatus(userId) {
        const user = Database.getUserById(userId);

        if (!user) {
            return { status: 'unknown', message: 'User not found' };
        }

        if (user.paymentStatus !== 'paid') {
            return { status: 'unpaid', message: 'Payment required' };
        }

        if (!user.matchId) {
            return { status: 'searching', message: 'Searching for your match...' };
        }

        if (!Database.isRevealDate()) {
            return {
                status: 'matched',
                message: 'Match found! Reveal on February 10th',
                matchId: user.matchId
            };
        }

        return {
            status: 'revealed',
            message: 'Your match has been revealed!',
            matchId: user.matchId
        };
    },

    // Get match details (only after reveal date)
    getMatchDetails(userId) {
        if (!Database.isRevealDate()) {
            return null; // Match not revealed yet
        }

        const match = Database.getMatch(userId);

        if (!match) return null;

        // Only return safe information
        return {
            fullName: match.fullName,
            phoneNumber: match.phoneNumber,
            city: match.city,
            gender: match.gender
        };
    }
};
