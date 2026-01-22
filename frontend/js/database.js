// =====================================================
// MY VAL - Database Module (LocalStorage-based)
// =====================================================

const Database = {
    USERS_KEY: 'myval_users',

    // Initialize database
    init() {
        if (!localStorage.getItem(this.USERS_KEY)) {
            localStorage.setItem(this.USERS_KEY, JSON.stringify([]));
        }
    },

    // Get all users
    getAllUsers() {
        const data = localStorage.getItem(this.USERS_KEY);
        return data ? JSON.parse(data) : [];
    },

    // Get user by ID
    getUserById(userId) {
        const users = this.getAllUsers();
        return users.find(u => u.id === userId);
    },

    // Get user by email
    getUserByEmail(email) {
        const users = this.getAllUsers();
        return users.find(u => u.email === email);
    },

    // Get user by phone
    getUserByPhone(phone) {
        const users = this.getAllUsers();
        return users.find(u => u.phoneNumber === phone);
    },

    // Save new user
    saveUser(user) {
        const users = this.getAllUsers();
        users.push(user);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    // Update user
    updateUser(userId, updates) {
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.id === userId);

        if (index !== -1) {
            users[index] = {
                ...users[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
            return users[index];
        }

        return null;
    },

    // Get paid users without a match
    getPaidUnmatchedUsers() {
        const users = this.getAllUsers();
        return users.filter(u => u.paymentStatus === 'paid' && !u.matchId);
    },

    // Get user's match
    getMatch(userId) {
        const user = this.getUserById(userId);
        if (!user || !user.matchId) return null;

        return this.getUserById(user.matchId);
    },

    // Set match between two users
    setMatch(userId1, userId2) {
        const users = this.getAllUsers();

        const index1 = users.findIndex(u => u.id === userId1);
        const index2 = users.findIndex(u => u.id === userId2);

        if (index1 !== -1 && index2 !== -1) {
            users[index1].matchId = userId2;
            users[index2].matchId = userId1;
            users[index1].updatedAt = new Date().toISOString();
            users[index2].updatedAt = new Date().toISOString();

            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
            return true;
        }

        return false;
    },

    // Reveal matches for all users (called on Feb 10th)
    revealAllMatches() {
        const users = this.getAllUsers();

        users.forEach(user => {
            if (user.matchId) {
                user.matchRevealed = true;
                user.updatedAt = new Date().toISOString();
            }
        });

        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    // Check if reveal date has passed
    isRevealDate() {
        const now = new Date();
        return now >= CONFIG.REVEAL_DATE;
    },

    // Get statistics
    getStats() {
        const users = this.getAllUsers();
        return {
            totalUsers: users.length,
            paidUsers: users.filter(u => u.paymentStatus === 'paid').length,
            matchedUsers: users.filter(u => u.matchId !== null).length,
            unmatchedPaid: users.filter(u => u.paymentStatus === 'paid' && !u.matchId).length
        };
    },

    // Clear all data (for testing)
    clearAll() {
        localStorage.removeItem(this.USERS_KEY);
        localStorage.removeItem('myval_user');
        this.init();
    }
};
