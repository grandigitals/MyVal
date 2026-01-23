// =====================================================
// MY VAL BACKEND - Firebase Service (Admin)
// Includes: user ops, matching audit, reveal logic, logs, TEST_MODE revealAt
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

// -------------------- BASIC USER OPS --------------------

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
        await db.collection("users").doc(userId).update({
            ...data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
    } catch (e) {
        console.error("Error updating user:", e);
        return false;
    }
}

// Paid + unmatched users
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

// -------------------- LOGGING / AUDIT --------------------

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

// -------------------- REVEAL TIME HELPERS --------------------

function isTestMode() {
    return String(process.env.TEST_MODE || "false").toLowerCase() === "true";
}

// If TEST_MODE=true => now + 2 mins
// Else => Feb 10 or PROD_REVEAL_ISO
function computeRevealAtMs() {
    if (isTestMode()) {
        return Date.now() + 2 * 60 * 1000;
    }

    // optional override
    const iso = process.env.PROD_REVEAL_ISO;
    if (iso) return new Date(iso).getTime();

    // default: Feb 10 of current year @ 00:00 (GMT+1-ish)
    const now = new Date();
    const year = now.getFullYear();
    return new Date(`${year}-02-10T00:00:00+01:00`).getTime();
}

// -------------------- MATCH CREATION + AUDIT --------------------

/**
 * Create match between two users + create matches audit doc
 * Also sets revealAt + matchRevealed false for BOTH users
 *
 * NOTE: This only affects NEW matches, not existing users.
 */
async function setMatch(userId1, userId2) {
    try {
        const db = getAdminDb();
        const batch = db.batch();

        const user1Ref = db.collection("users").doc(userId1);
        const user2Ref = db.collection("users").doc(userId2);

        // Create audit record in matches/
        const matchRef = db.collection("matches").doc();

        const revealAtMs = computeRevealAtMs();
        const revealAt = admin.firestore.Timestamp.fromMillis(revealAtMs);

        // Update BOTH users
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

        // Save audit record
        batch.set(matchRef, {
            userA: userId1,
            userB: userId2,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            revealAt,
            status: "matched",
            testMode: isTestMode(),
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

// -------------------- REVEAL FLIP (THE IMPORTANT PART) --------------------

/**
 * When user visits /reveal page, frontend can call backend to flip if due.
 * This updates:
 *  - users/{uid}.matchRevealed = true
 *  - users/{matchId}.matchRevealed = true
 *  - matches/{matchDocId}.status = "revealed"
 *  - matches/{matchDocId}.revealedAt = now
 *
 * This protects you later if someone claims "I wasn't revealed".
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
        `🕒 Reveal check for ${userId}: now=${now.toISOString()} revealAt=${revealAtDate.toISOString()}`
    );

    // Not yet time
    if (now < revealAtDate) {
        return { ok: true, due: false, revealAt: revealAtDate.toISOString() };
    }

    // Already revealed
    if (user.matchRevealed === true) {
        return { ok: true, due: true, already: true };
    }

    const matchDocId = user.matchDocId || null;

    const userRef = db.collection("users").doc(userId);
    const otherRef = db.collection("users").doc(user.matchId);

    const batch = db.batch();

    batch.update(userRef, {
        matchRevealed: true,
        revealedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    batch.update(otherRef, {
        matchRevealed: true,
        revealedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (matchDocId) {
        const matchRef = db.collection("matches").doc(matchDocId);
        batch.update(matchRef, {
            status: "revealed",
            revealedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    await batch.commit();

    console.log(`🎉 Match revealed for user=${userId} matchDocId=${matchDocId || "none"}`);

    await audit("MATCH_REVEALED", {
        userId,
        otherUserId: user.matchId,
        matchDocId,
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
