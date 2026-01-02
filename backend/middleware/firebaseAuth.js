const { initFirebaseAdmin } = require('../config/firebaseAdmin');

function authenticateFirebaseToken(req, res, next) {
    try {
        const header = req.headers['authorization'] || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const admin = initFirebaseAdmin();
        admin
            .auth()
            .verifyIdToken(token)
            .then((decoded) => {
                req.user = {
                    uid: decoded.uid,
                    email: decoded.email,
                    admin: !!decoded.admin,
                    claims: decoded
                };
                next();
            })
            .catch(() => {
                return res.status(403).json({ error: 'Token inválido' });
            });
    } catch (e) {
        return res.status(500).json({ error: 'Error interno de autenticación' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user?.admin) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    return next();
}

module.exports = {
    authenticateFirebaseToken,
    requireAdmin
};
