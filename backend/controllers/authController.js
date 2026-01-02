const { initFirebaseAdmin, getDb } = require('../config/firebaseAdmin');
const { sendWelcomeEmail } = require('../services/emailService');

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

        // Enviar correo de bienvenida (no bloquea ni rompe el registro si falla)
        const uid = userRecord.uid;
        void (async () => {
            try {
                const userRef = db.collection('users').doc(uid);
                await userRef.set(
                    {
                        emailStatus: {
                            welcome: {
                                status: 'sending',
                                updatedAt: admin.firestore.FieldValue.serverTimestamp()
                            }
                        }
                    },
                    { merge: true }
                );

                const result = await sendWelcomeEmail({ email, name: name || '' });

                await userRef.set(
                    {
                        emailStatus: {
                            welcome: {
                                status: 'sent',
                                messageId: result?.data?.id || null,
                                sentAt: admin.firestore.FieldValue.serverTimestamp()
                            }
                        }
                    },
                    { merge: true }
                );
            } catch (err) {
                console.error('Welcome email error:', err);
                try {
                    await db.collection('users').doc(uid).set(
                        {
                            emailStatus: {
                                welcome: {
                                    status: 'error',
                                    error: String(err?.message || err),
                                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                                }
                            }
                        },
                        { merge: true }
                    );
                } catch (e) {
                    console.error('Welcome email status update error:', e);
                }
            }
        })();

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
        if (message.includes('There is no configuration corresponding to the provided identifier')) {
            return res.status(500).json({
                error: 'Firebase Authentication no está habilitado/configurado. Ve a Firebase Console → Authentication → Get started y habilita Email/Password.'
            });
        }
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
        if (message.includes('There is no configuration corresponding to the provided identifier')) {
            return res.status(500).json({
                error: 'Firebase Authentication no está habilitado/configurado. Ve a Firebase Console → Authentication → Get started y habilita Email/Password.'
            });
        }
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
