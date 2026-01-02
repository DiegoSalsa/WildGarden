require('dotenv').config();

const { initFirebaseAdmin, getDb } = require('../config/firebaseAdmin');

async function main() {
    const email = process.argv[2];
    const adminValueRaw = process.argv[3] ?? 'true';
    const adminValue = String(adminValueRaw).toLowerCase() === 'true';

    if (!email) {
        console.error('Uso: node scripts/setAdmin.js <email> [true|false]');
        process.exit(1);
    }

    const admin = initFirebaseAdmin();
    const db = getDb();

    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: adminValue });

    await db.collection('users').doc(userRecord.uid).set(
        {
            role: adminValue ? 'admin' : 'customer',
            email: userRecord.email || email,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
    );

    console.log(`OK: ${email} => admin=${adminValue} (uid=${userRecord.uid})`);
    console.log('Nota: el usuario debe volver a iniciar sesión para que el token incluya el claim admin.');
}

main().catch((err) => {
    const message = String(err?.message || err);
    if (message.includes('There is no configuration corresponding to the provided identifier')) {
        console.error('Error: Firebase Authentication no está habilitado/configurado. Ve a Firebase Console → Authentication → Get started y habilita Email/Password.');
        process.exit(1);
    }
    console.error('Error:', message);
    process.exit(1);
});
