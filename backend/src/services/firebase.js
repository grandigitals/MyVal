// =====================================================
// MY VAL BACKEND - Firebase Admin Service
// =====================================================

const admin = require('firebase-admin');

let db = null;

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
    try {
        // Check if already initialized
        if (admin.apps.length > 0) {
            db = admin.firestore();
            return;
        }

        // Initialize with service account
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (serviceAccountPath) {
            const serviceAccount = require(serviceAccountPath.startsWith('.')
                ? `../../${serviceAccountPath}`
                : serviceAccountPath);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            // Use default credentials (for Cloud environments)
            admin.initializeApp({
                credential: admin.credential.applicationDefault()
            });
        }

        db = admin.firestore();
        console.log('✅ Firebase Admin initialized successfully');

    } catch (error) {
        console.error('❌ Firebase Admin initialization error:', error.message);
        console.log('⚠️  Make sure serviceAccountKey.json exists in the backend folder');
        console.log('   Download from: Firebase Console > Project Settings > Service Accounts');
    }
}

/**
 * Get user by ID
 */
async function getUser(userId) {
    try {
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        const doc = await db.collection('users').doc(userId).get();

        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }

        return null;

    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

/**
 * Update user data
 */
async function updateUser(userId, data) {
    try {
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        await db.collection('users').doc(userId).update({
            ...data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return true;

    } catch (error) {
        console.error('Error updating user:', error);
        return false;
    }
}

/**
 * Get all paid unmatched users
 */
async function getPaidUnmatchedUsers() {
    try {
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        const snapshot = await db.collection('users')
            .where('paymentStatus', '==', 'paid')
            .get();

        // Filter out users who already have matches
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.matchId) {
                users.push({ id: doc.id, ...data });
            }
        });

        return users;

    } catch (error) {
        console.error('Error getting unmatched users:', error);
        return [];
    }
}

/**
 * Set match between two users
 */
async function setMatch(userId1, userId2) {
    try {
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        const batch = db.batch();
        const user1Ref = db.collection('users').doc(userId1);
        const user2Ref = db.collection('users').doc(userId2);

        batch.update(user1Ref, {
            matchId: userId2,
            matchedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        batch.update(user2Ref, {
            matchId: userId1,
            matchedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        return true;

    } catch (error) {
        console.error('Error setting match:', error);
        return false;
    }
}

/**
 * Get Firestore instance
 */
function getFirestore() {
    return db;
}

module.exports = {
    initializeFirebase,
    getUser,
    updateUser,
    getPaidUnmatchedUsers,
    setMatch,
    getFirestore
};
