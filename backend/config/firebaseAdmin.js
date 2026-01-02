const admin = require('firebase-admin');

function getServiceAccount() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON no es JSON válido');
        }
    }

    if (b64) {
        try {
            const json = Buffer.from(b64, 'base64').toString('utf8');
            return JSON.parse(json);
        } catch (e) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 no es válido');
        }
    }

    return null;
}

function initFirebaseAdmin() {
    if (admin.apps.length) return admin;

    const serviceAccount = getServiceAccount();
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    if (!serviceAccount) {
        throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_BASE64');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
        ...(storageBucket ? { storageBucket } : {})
    });

    return admin;
}

function getDb() {
    const firebase = initFirebaseAdmin();
    return firebase.firestore();
}

module.exports = {
    admin,
    initFirebaseAdmin,
    getDb
};
