const { initFirebaseAdmin, getDb } = require('../config/firebaseAdmin');

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;

async function signInWithPassword(email, password) {
    if (!FIREBASE_WEB_API_KEY) {
        throw new Error('Falta FIREBASE_WEB_API_KEY');
    }

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const data = await response.json();
    if (!response.ok) {
        const message = data?.error?.message || 'Error al iniciar sesión';
        throw new Error(message);
    }
    return data;
}

const register = async (req, res) => {
    try {
        const { email, name, password, phone, address, city } = req.body;

        const admin = initFirebaseAdmin();
        const db = getDb();

        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name || undefined
        });

        await db.collection('users').doc(userRecord.uid).set(
            {
                email,
                name: name || '',
                phone: phone || '',
                address: address || '',
                city: city || '',
                role: 'customer',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: {
                id: userRecord.uid,
                email,
                name: name || ''
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        const message = String(error?.message || 'Error al registrar usuario');
        if (message.includes('email') && message.includes('already')) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        res.status(500).json({ error: message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = initFirebaseAdmin();
        const db = getDb();

        const data = await signInWithPassword(email, password);
        const uid = data.localId;
        const token = data.idToken;

        const userDoc = await db.collection('users').doc(uid).get();
        const profile = userDoc.exists ? userDoc.data() : {};

        await db.collection('users').doc(uid).set(
            {
                email,
                lastLogin: admin.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: uid,
                email,
                name: profile?.name || ''
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        const message = String(error?.message || 'Error al iniciar sesión');
        if (message.includes('INVALID_PASSWORD') || message.includes('EMAIL_NOT_FOUND')) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }
        res.status(500).json({ error: message });
    }
};

module.exports = {
    register,
    login
};
