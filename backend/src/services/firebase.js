// =====================================================
// MY VAL BACKEND - Firebase Service (Admin)
// Includes: user ops, matching audit, reveal flip, TEST_MODE revealAt
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

// -------------------- helpers --------------------

function isTestMode() {
    return String(process.env.TEST_MODE || "false").toLowerCase() === "true";
}

// TEST_MODE=true => now + 2 mins
// TEST_MODE=false => PROD_REVEAL_ISO OR default Feb 10
function computeRevealAtMs() {
    if (isTestMode()) return Date.now() + 2 * 60 * 1000;

    const iso = process.env.PROD_REVEAL_ISO;
    if (iso) return new Date(iso).getTime();

    const year = new Date().getFullYear();
    return new Date(`${year}-02-10T00:00:00+01:00`).getTime();
}

async function audit(type, payload = {}) {
    try {
        const db = getAdminDb();
        await db.collection("audit_logs").add({
            type,
            payload,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
        console.error("Audit log failed:", e);
    }
}

// -------------------- user ops --------------------

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

        const snapshot = await db
            .collection("users")
            .where("paymentStatus", "==", "paid")
            .get();

        const users = [];
        snapshot.forEach((doc) => {
            const data = doc.data() || {};
            if (!data.matchId) users.push({ id: doc.id, ...data });
        });

        console.log(`📋 Found ${users.length} paid unmatched users`);
        return users;
    } catch (e) {
        console.error("Error getting unmatched users:", e);
        return [];
    }
}

// -------------------- matching + audit --------------------

/**
 * Create match between two users + create matches audit doc
 * Sets revealAt + matchRevealed false for BOTH users
 *
 * opts: { revealAtMs?: number, testMode?: boolean }
 */
async function setMatch(userId1, userId2, opts = {}) {
    try {
        const db = getAdminDb();
        const batch = db.batch();

        const user1Ref = db.collection("users").doc(userId1);
        const user2Ref = db.collection("users").doc(userId2);

        const matchRef = db.collection("matches").doc(); // audit record

        const revealAtMs = Number(opts.revealAtMs) || computeRevealAtMs();
        const revealAt = admin.firestore.Timestamp.fromMillis(revealAtMs);

        batch.update(user1Ref, {
            matchId: userId2,
            matchDocId: matchRef.id,
            matchedAt: admin.firestore.FieldValue.serverTimestamp(),
            revealAt,
            matchRevealed: false,
        });

        batch.update(user2Ref, {
            matchId: userId1,
            matchDocId: matchRef.id,
            matchedAt: admin.firestore.FieldValue.serverTimestamp(),
            revealAt,
            matchRevealed: false,
        });

        batch.set(matchRef, {
            userA: userId1,
            userB: userId2,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            revealAt,
            status: "matched",
            testMode: typeof opts.testMode === "boolean" ? opts.testMode : isTestMode(),
            revealedAt: null,
        });

        await batch.commit();

        console.log(
            `✅ Match set: ${userId1} <-> ${userId2} | matchDocId=${matchRef.id} | revealAt=${new Date(
                revealAtMs
            ).toISOString()} | TEST_MODE=${isTestMode()}`
        );

        await audit("MATCH_CREATED", {
            matchDocId: matchRef.id,
            userA: userId1,
            userB: userId2,
            revealAt: new Date(revealAtMs).toISOString(),
            testMode: isTestMode(),
        });

        return { ok: true, matchDocId: matchRef.id, revealAtMs };
    } catch (e) {
        console.error("Error setting match:", e);
        await audit("MATCH_ERROR", { userId1, userId2, error: e.message });
        return { ok: false, error: e.message };
    }
}

// -------------------- reveal flip --------------------

/**
 * Called when user opens /reveal page.
 * If reveal time has passed, flips matchRevealed=true for BOTH users and updates matches doc.
 */
async function markMatchRevealedIfDue(userId) {
    const db = getAdminDb();
    const user = await getUser(userId);

    if (!user) return { ok: false, error: "User not found" };
    if (!user.matchId) return { ok: false, error: "No match for user" };

    const revealAtDate = user.revealAt?.toDate ? user.revealAt.toDate() : null;
    if (!revealAtDate) return { ok: false, error: "Missing revealAt on user" };

    const now = new Date();

    console.log(
        `🕒 [REVEAL] check uid=${userId} now=${now.toISOString()} revealAt=${revealAtDate.toISOString()}`
    );

    if (now < revealAtDate) {
        return { ok: true, due: false, revealAt: revealAtDate.toISOString() };
    }

    if (user.matchRevealed === true) {
        return { ok: true, due: true, already: true };
    }

    const batch = db.batch();
    const userRef = db.collection("users").doc(userId);
    const otherRef = db.collection("users").doc(user.matchId);

    batch.update(userRef, {
        matchRevealed: true,
        revealedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    batch.update(otherRef, {
        matchRevealed: true,
        revealedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (user.matchDocId) {
        const matchRef = db.collection("matches").doc(user.matchDocId);
        batch.update(matchRef, {
            status: "revealed",
            revealedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    await batch.commit();

    console.log(`🎉 [REVEAL] Match revealed for uid=${userId} matchDocId=${user.matchDocId || "none"}`);

    await audit("MATCH_REVEALED", {
        userId,
        otherUserId: user.matchId,
        matchDocId: user.matchDocId || null,
    });

    return { ok: true, due: true, changed: true };
}

module.exports = {
    initializeFirebase,
    getAdminDb,
    verifyFirebaseToken,
    getUser,
    updateUser,
    getPaidUnmatchedUsers,
    setMatch,
    markMatchRevealedIfDue,
    audit,
    isTestMode,
    computeRevealAtMs,
};
