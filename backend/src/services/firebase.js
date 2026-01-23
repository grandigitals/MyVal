const admin = require("firebase-admin");

let initialized = false;

function initializeFirebase() {
    if (initialized) return;

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
        throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var");
    }

    const serviceAccount = JSON.parse(raw);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    initialized = true;
    console.log("✅ Firebase Admin initialized");
}

function getAdminDb() {
    return admin.firestore();
}

async function verifyFirebaseToken(idToken) {
    return admin.auth().verifyIdToken(idToken);
}

// Get user by ID
async function getUser(userId) {
    try {
        const db = getAdminDb();
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

// Update user data
async function updateUser(userId, data) {
    try {
        const db = getAdminDb();
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

// Get all paid users who don't have a match yet
async function getPaidUnmatchedUsers() {
    try {
        const db = getAdminDb();

        // Get all users who have paid
        const snapshot = await db.collection('users')
            .where('paymentStatus', '==', 'paid')
            .get();

        // Filter out users who already have matches
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Include users who have no matchId or matchId is null
            if (!data.matchId) {
                users.push({ id: doc.id, ...data });
            }
        });

        console.log(`📋 Found ${users.length} paid unmatched users`);
        return users;

    } catch (error) {
        console.error('Error getting unmatched users:', error);
        return [];
    }
}

// Set match between two users
async function setMatch(userId1, userId2) {
    try {
        const db = getAdminDb();
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
        console.log(`✅ Match set: ${userId1} <-> ${userId2}`);
        return true;

    } catch (error) {
        console.error('Error setting match:', error);
        return false;
    }
}

module.exports = {
    initializeFirebase,
    getAdminDb,
    verifyFirebaseToken,
    getUser,
    updateUser,
    getPaidUnmatchedUsers,
    setMatch,
};
