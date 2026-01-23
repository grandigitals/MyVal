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

module.exports = {
    initializeFirebase,
    getAdminDb,
    verifyFirebaseToken,
};
