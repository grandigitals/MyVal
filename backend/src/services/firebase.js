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
        const doc = await db.collection("users").doc(userId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
        return null;
    } catch (error) {
        console.error("Error getting user:", error);
        return null;
    }
}

// Update user data
async function updateUser(userId, data) {
    try {
        const db = getAdminDb();
        await db.collection("users").doc(userId).set(
            {
                ...data,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );
        return true;
    } catch (error) {
        console.error("Error updating user:", error);
        return false;
    }
}

// Get all paid users who don't have a match yet
async function getPaidUnmatchedUsers() {
    try {
        const db = getAdminDb();

        // 1) paymentStatus == "paid"
        const snapPaid = await db.collection("users").where("paymentStatus", "==", "paid").get();

        // 2) is_premium == true (fallback, if some users were marked premium without paymentStatus)
        const snapPremium = await db.collection("users").where("is_premium", "==", true).get();

        const map = new Map();

        const addIfUnmatched = (doc) => {
            const data = doc.data() || {};
            // Only users without matchId (null OR missing)
            if (!data.matchId) {
                map.set(doc.id, { id: doc.id, ...data });
            }
        };

        snapPaid.forEach(addIfUnmatched);
        snapPremium.forEach(addIfUnmatched);

        const users = Array.from(map.values());
        console.log(`📋 Found ${users.length} paid/premium unmatched users`);
        return users;
    } catch (error) {
        console.error("Error getting unmatched users:", error);
        return [];
    }
}

// Set match between two users (NOW STORES revealAt + matchRevealed)
async function setMatch(userId1, userId2, meta = {}) {
    try {
        const db = getAdminDb();
        const batch = db.batch();

        const user1Ref = db.collection("users").doc(userId1);
        const user2Ref = db.collection("users").doc(userId2);

        const revealAt =
            typeof meta.revealAt === "number"
                ? admin.firestore.Timestamp.fromMillis(meta.revealAt)
                : null;

        const base = {
            matchRevealed: false,
            matchedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const extra = {};
        if (revealAt) extra.revealAt = revealAt;
        if (typeof meta.testMode === "boolean") extra.testMode = meta.testMode;

        batch.set(
            user1Ref,
            {
                matchId: userId2,
                ...base,
                ...extra,
            },
            { merge: true }
        );

        batch.set(
            user2Ref,
            {
                matchId: userId1,
                ...base,
                ...extra,
            },
            { merge: true }
        );

        await batch.commit();
        console.log(`✅ Match set: ${userId1} <-> ${userId2} | revealAt=${meta.revealAt || "none"} testMode=${meta.testMode}`);
        return true;
    } catch (error) {
        console.error("Error setting match:", error);
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
