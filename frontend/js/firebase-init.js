// =====================================================
// MY VAL - Firebase Initialization
// =====================================================

// Initialize Firebase
let db = null;
let auth = null;

function initFirebase() {
    try {
        // Check if Firebase config is set
        if (CONFIG.FIREBASE_CONFIG.apiKey === "YOUR_FIREBASE_API_KEY") {
            console.warn('⚠️ Firebase not configured. Using localStorage fallback.');
            return false;
        }

        firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        db = firebase.firestore();
        auth = firebase.auth();
        console.log('✅ Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

// Check if Firebase is available
function isFirebaseReady() {
    return db !== null && auth !== null;
}

// Initialize on load
const firebaseReady = initFirebase();

// =====================================================
// Database Operations (Firebase or LocalStorage fallback)
// =====================================================

const Database = {
    USERS_KEY: 'myval_users',

    // Initialize localStorage database
    initLocal() {
        if (!localStorage.getItem(this.USERS_KEY)) {
            localStorage.setItem(this.USERS_KEY, JSON.stringify([]));
        }
    },

    // Get all users (localStorage)
    getAllUsersLocal() {
        const data = localStorage.getItem(this.USERS_KEY);
        return data ? JSON.parse(data) : [];
    },

    // Save user to Firestore
    async saveUser(userData) {
        if (isFirebaseReady()) {
            try {
                await db.collection('users').doc(userData.uid).set(userData);
                return true;
            } catch (error) {
                console.error('Error saving user:', error);
                return false;
            }
        } else {
            // LocalStorage fallback
            this.initLocal();
            const users = this.getAllUsersLocal();
            users.push(userData);
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
            return true;
        }
    },

    // Get user by UID
    async getUser(uid) {
        if (isFirebaseReady()) {
            try {
                const doc = await db.collection('users').doc(uid).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
                return null;
            } catch (error) {
                console.error('Error getting user:', error);
                return null;
            }
        } else {
            // LocalStorage fallback
            const users = this.getAllUsersLocal();
            return users.find(u => u.uid === uid) || null;
        }
    },

    // Update user
    async updateUser(uid, updates) {
        if (isFirebaseReady()) {
            try {
                await db.collection('users').doc(uid).update({
                    ...updates,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                return true;
            } catch (error) {
                console.error('Error updating user:', error);
                return false;
            }
        } else {
            // LocalStorage fallback
            const users = this.getAllUsersLocal();
            const index = users.findIndex(u => u.uid === uid);
            if (index !== -1) {
                users[index] = { ...users[index], ...updates };
                localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
                return true;
            }
            return false;
        }
    },

    // Check if email exists
    async emailExists(email) {
        if (isFirebaseReady()) {
            try {
                const snapshot = await db.collection('users').where('email', '==', email).get();
                return !snapshot.empty;
            } catch (error) {
                console.error('Error checking email:', error);
                return false;
            }
        } else {
            const users = this.getAllUsersLocal();
            return users.some(u => u.email === email);
        }
    },

    // Check if phone exists
    async phoneExists(phone) {
        if (isFirebaseReady()) {
            try {
                const snapshot = await db.collection('users').where('phoneNumber', '==', phone).get();
                return !snapshot.empty;
            } catch (error) {
                console.error('Error checking phone:', error);
                return false;
            }
        } else {
            const users = this.getAllUsersLocal();
            return users.some(u => u.phoneNumber === phone);
        }
    },

    // Get paid unmatched users for matching
    async getPaidUnmatchedUsers() {
        if (isFirebaseReady()) {
            try {
                const snapshot = await db.collection('users')
                    .where('paymentStatus', '==', 'paid')
                    .where('matchId', '==', null)
                    .get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error('Error getting unmatched users:', error);
                return [];
            }
        } else {
            const users = this.getAllUsersLocal();
            return users.filter(u => u.paymentStatus === 'paid' && !u.matchId);
        }
    },

    // Get user's match
    async getMatch(matchId) {
        return await this.getUser(matchId);
    },

    // Set match between two users
    async setMatch(uid1, uid2) {
        if (isFirebaseReady()) {
            try {
                const batch = db.batch();
                batch.update(db.collection('users').doc(uid1), { matchId: uid2 });
                batch.update(db.collection('users').doc(uid2), { matchId: uid1 });
                await batch.commit();
                return true;
            } catch (error) {
                console.error('Error setting match:', error);
                return false;
            }
        } else {
            const users = this.getAllUsersLocal();
            const i1 = users.findIndex(u => u.uid === uid1);
            const i2 = users.findIndex(u => u.uid === uid2);
            if (i1 !== -1 && i2 !== -1) {
                users[i1].matchId = uid2;
                users[i2].matchId = uid1;
                localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
                return true;
            }
            return false;
        }
    },

    // Check if reveal date has passed
    isRevealDate() {
        return new Date() >= CONFIG.REVEAL_DATE;
    }
};

// =====================================================
// Authentication Helper
// =====================================================

const Auth = {
    // Get current user
    getCurrentUser() {
        if (isFirebaseReady()) {
            return auth.currentUser;
        } else {
            const userData = localStorage.getItem('myval_current_user');
            return userData ? JSON.parse(userData) : null;
        }
    },

    // Sign up with email/password
    async signup(email, password) {
        if (isFirebaseReady()) {
            try {
                const result = await auth.createUserWithEmailAndPassword(email, password);
                return { success: true, user: result.user };
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            // LocalStorage fallback
            const uid = 'user_' + Date.now();
            const user = { uid, email };
            localStorage.setItem('myval_current_user', JSON.stringify(user));
            return { success: true, user };
        }
    },

    // Login with email/password
    async login(email, password) {
        if (isFirebaseReady()) {
            try {
                const result = await auth.signInWithEmailAndPassword(email, password);
                return { success: true, user: result.user };
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            // LocalStorage fallback
            const users = Database.getAllUsersLocal();
            const user = users.find(u => u.email === email);
            if (user && user.password === password) {
                localStorage.setItem('myval_current_user', JSON.stringify({ uid: user.uid, email }));
                return { success: true, user: { uid: user.uid, email } };
            }
            return { success: false, error: 'Invalid email or password' };
        }
    },

    // Logout
    async logout() {
        if (isFirebaseReady()) {
            try {
                await auth.signOut();
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        localStorage.removeItem('myval_current_user');
        window.location.href = 'index.html';
    },

    // Check if logged in
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    // Require auth (redirect if not logged in)
    requireAuth() {
        // Wait for Firebase auth state
        if (isFirebaseReady()) {
            return new Promise((resolve) => {
                auth.onAuthStateChanged((user) => {
                    if (user) {
                        resolve(user);
                    } else {
                        window.location.href = 'login.html';
                    }
                });
            });
        } else {
            if (!this.isLoggedIn()) {
                window.location.href = 'login.html';
                return Promise.reject('Not logged in');
            }
            return Promise.resolve(this.getCurrentUser());
        }
    }
};

// =====================================================
// Matching Logic
// =====================================================

const Matching = {
    // Run matching for a user after payment
    async runMatchingForUser(uid) {
        const user = await Database.getUser(uid);
        if (!user || user.matchId) return null;

        const candidates = await Database.getPaidUnmatchedUsers();
        const match = this.findBestMatch(user, candidates);

        if (match) {
            await Database.setMatch(user.uid, match.uid);
            console.log('Match created:', user.fullName, '<->', match.fullName);
            return match.uid;
        }

        return null;
    },

    // Find best match
    findBestMatch(user, candidates) {
        const validCandidates = candidates
            .filter(c => c.uid !== user.uid)
            .map(c => ({ user: c, score: this.calculateScore(user, c) }))
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score);

        return validCandidates.length > 0 ? validCandidates[0].user : null;
    },

    // Calculate compatibility score
    calculateScore(user1, user2) {
        // Gender preference match required (opposite gender)
        const u1AcceptsU2 = user1.genderPreference === 'any' || user1.genderPreference === user2.gender;
        const u2AcceptsU1 = user2.genderPreference === 'any' || user2.genderPreference === user1.gender;
        if (!u1AcceptsU2 || !u2AcceptsU1) return 0;

        let score = 50; // Base score for opposite gender match

        // Same state gives higher priority
        if (user1.city?.toLowerCase() === user2.city?.toLowerCase()) {
            score += 50; // Same state bonus
        }
        // Cross-state still allowed but lower priority

        return score;
    }
};

// =====================================================
// Utility Functions
// =====================================================

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
}

function hideError(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.display = 'none';
    }
}

function calculateAge(dateString) {
    const birth = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function isValidPhone(phone) {
    // Clean the phone number - remove spaces, dashes, and other characters
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Convert +234 to 0
    if (cleaned.startsWith('+234')) {
        cleaned = '0' + cleaned.slice(4);
    } else if (cleaned.startsWith('234')) {
        cleaned = '0' + cleaned.slice(3);
    }

    // Must be 11 digits starting with 0
    if (cleaned.length !== 11 || !cleaned.startsWith('0')) {
        return false;
    }

    // Valid Nigerian mobile prefixes
    const validPrefixes = [
        // MTN
        '0703', '0706', '0803', '0806', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916',
        // Glo
        '0705', '0805', '0807', '0811', '0815', '0905', '0915',
        // Airtel
        '0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904', '0907', '0912',
        // 9mobile
        '0809', '0817', '0818', '0908', '0909',
        // Other
        '0702', '0704', '0709', '0819'
    ];

    const prefix = cleaned.substring(0, 4);
    return validPrefixes.includes(prefix);
}
