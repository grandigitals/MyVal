// =====================================================
// MY VAL BACKEND - Firebase Service (with match audit + revealAt)
// =====================================================

const admin = require("firebase-admin");

let initialized = false;

function initializeFirebase() {
    if (initialized) return;

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var");

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

async function getUser(userId) {
    try {
        const db = getAdminDb();
        const doc = await db.collection("users").doc(userId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) {
        console.error("Error getting user:", e);
        return null;
    }
}

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
    } catch (e) {
        console.error("Error updating user:", e);
        return false;
    }
}

async function getPaidUnmatchedUsers() {
    try {
        const db = getAdminDb();

        // Paid users (you can expand this later if you add other flags)
        const snapshot = await db.collection("users").where("paymentStatus", "==", "paid").get();

        const users = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.matchId) users.push({ id: doc.id, ...data });
        });

        console.log(`📋 Found ${users.length} paid unmatched users`);
        return users;
    } catch (e) {
        console.error("Error getting unmatched users:", e);
        return [];
    }
}

/**
 * Create match between two users.
 * - sets matchId, matchedAt
 * - sets revealAt (Timestamp)
 * - sets matchRevealed=false
 * - writes an audit record in matches/
 */
async function setMatch(userId1, userId2, opts = {}) {
    try {
        const db = getAdminDb();
        const batch = db.batch();

        const revealAtMs = Number(opts.revealAt);
        if (!revealAtMs || Number.isNaN(revealAtMs)) {
            throw new Error("setMatch missing valid opts.revealAt (ms)");
        }

        const revealAt = admin.firestore.Timestamp.fromMillis(revealAtMs);

        const user1Ref = db.collection("users").doc(userId1);
        const user2Ref = db.collection("users").doc(userId2);

        const matchRef = db.collection("matches").doc(); // audit

        batch.set(
            user1Ref,
            {
                matchId: userId2,
                matchedAt: admin.firestore.FieldValue.serverTimestamp(),
                revealAt,
                matchRevealed: false,
            },
            { merge: true }
        );

        batch.set(
            user2Ref,
            {
                matchId: userId1,
                matchedAt: admin.firestore.FieldValue.serverTimestamp(),
                revealAt,
                matchRevealed: false,
            },
            { merge: true }
        );

        batch.set(matchRef, {
            userA: userId1,
            userB: userId2,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            revealAt,
            testMode: !!opts.testMode,
            status: "matched",
        });

        await batch.commit();

        console.log(
            `✅ Match set: ${userId1} <-> ${userId2} | revealAt=${new Date(revealAtMs).toISOString()} | testMode=${!!opts.testMode}`
        );
        console.log(`🧾 Audit saved: matches/${matchRef.id}`);

        return true;
    } catch (e) {
        console.error("Error setting match:", e);
        return false;
    }
}

/**
 * Mark a user as revealed (for your “proof” later).
 * Called when reveal time is reached and user opens /reveal.
 */
async function markUserRevealed(userId) {
    try {
        const db = getAdminDb();
        await db.collection("users").doc(userId).set(
            {
                matchRevealed: true,
                revealedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        console.log(`🎉 Marked matchRevealed=true for userId=${userId}`);
        return true;
    } catch (e) {
        console.error("Error marking revealed:", e);
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
    markUserRevealed,
};
