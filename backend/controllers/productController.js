const { getDb, initFirebaseAdmin } = require('../config/firebaseAdmin');

function normalizeImageUrls(data) {
    const urls = Array.isArray(data?.image_urls)
        ? data.image_urls.filter(u => typeof u === 'string' && u.trim()).map(u => u.trim())
        : [];

    if (urls.length) return urls.slice(0, 3);
    if (typeof data?.image_url === 'string' && data.image_url.trim()) return [data.image_url.trim()];
    return [];
}

function toMillis(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    if (typeof ts._seconds === 'number') return ts._seconds * 1000;
    return 0;
}

function parseOptionalDate(value) {
    if (value === undefined) return undefined; // not provided
    if (value === null) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
        throw new Error('Fecha inválida');
    }
    return d;
}

function toTimestampOrNull(firebaseAdmin, dateOrNull) {
    if (dateOrNull === undefined) return undefined;
    if (dateOrNull === null) return null;
    return firebaseAdmin.firestore.Timestamp.fromDate(dateOrNull);
}

const getProducts = async (req, res) => {
    try {
        const db = getDb();
        // Nota: where + orderBy en distinto campo requiere índice compuesto en Firestore.
        // Para evitar depender de índices, consultamos y ordenamos en memoria.
        const snap = await db
            .collection('products')
            .where('isActive', '==', true)
            .get();

        const products = snap.docs.map(d => {
            const data = d.data() || {};
            const image_urls = normalizeImageUrls(data);
            return {
                product_id: d.id,
                ...data,
                image_urls,
                image_url: image_urls[0] || data.image_url || ''
            };
        })
            .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

        // Cache corto para mejorar percepción de carga (lista pública)
        res.set('Cache-Control', 'public, max-age=60');
        res.json(products);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const db = getDb();
        const doc = await db.collection('products').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const data = doc.data() || {};
        const image_urls = normalizeImageUrls(data);

        // Cache corto para mejorar percepción de carga (detalle público)
        res.set('Cache-Control', 'public, max-age=60');
        res.json({
            product_id: doc.id,
            ...data,
            image_urls,
            image_url: image_urls[0] || data.image_url || ''
        });
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
};

const createProduct = async (req, res) => {
    try {
        const {
            product_id,
            name,
            description,
            price,
            category,
            image_url,
            image_urls,
            isActive,
            discountPercent,
            discountEnabled,
            discountStartAt,
            discountEndAt
        } = req.body;

        const admin = initFirebaseAdmin();
        const db = getDb();
        const id = product_id || db.collection('products').doc().id;

        const normalizedUrls = normalizeImageUrls({ image_url, image_urls });

        const startDate = parseOptionalDate(discountStartAt);
        const endDate = parseOptionalDate(discountEndAt);
        if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
            return res.status(400).json({ error: 'discountEndAt no puede ser anterior a discountStartAt' });
        }

        const pct = Math.max(0, Math.min(100, Number(discountPercent) || 0));

        const payload = {
            name: name || '',
            description: description || '',
            price: Number(price) || 0,
            category: category || '',
            image_urls: normalizedUrls,
            image_url: normalizedUrls[0] || '',
            isActive: typeof isActive === 'boolean' ? isActive : true,
            discountPercent: pct,
            discountEnabled: discountEnabled === true && pct > 0,
            discountStartAt: toTimestampOrNull(admin, startDate ?? null),
            discountEndAt: toTimestampOrNull(admin, endDate ?? null),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('products').doc(id).set(payload);
        res.status(201).json({ product_id: id, ...payload });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
};

// Admin: listar todos (activos e inactivos)
const adminListProducts = async (req, res) => {
    try {
        const db = getDb();
        const snap = await db
            .collection('products')
            .orderBy('createdAt', 'desc')
            .get();

        const products = snap.docs.map(d => ({
            product_id: d.id,
            ...d.data()
        }));

        res.json({ products });
    } catch (error) {
        console.error('Error al obtener productos (admin):', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
};

// Admin: actualizar producto
const updateProduct = async (req, res) => {
    try {
        const id = req.params.product_id || req.params.id;
        const {
            name,
            description,
            price,
            category,
            image_url,
            image_urls,
            isActive,
            discountPercent,
            discountEnabled,
            discountStartAt,
            discountEndAt
        } = req.body || {};

        if (!id) {
            return res.status(400).json({ error: 'Falta product_id' });
        }

        const admin = initFirebaseAdmin();
        const db = getDb();
        const ref = db.collection('products').doc(id);
        const doc = await ref.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const patch = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (typeof name === 'string') patch.name = name;
        if (typeof description === 'string') patch.description = description;
        if (price !== undefined) patch.price = Number(price) || 0;
        if (typeof category === 'string') patch.category = category;
        if (Array.isArray(image_urls) || typeof image_url === 'string') {
            const normalizedUrls = normalizeImageUrls({ image_url, image_urls });
            patch.image_urls = normalizedUrls;
            patch.image_url = normalizedUrls[0] || '';
        }
        if (typeof isActive === 'boolean') patch.isActive = isActive;

        if (discountPercent !== undefined) {
            const pct = Math.max(0, Math.min(100, Number(discountPercent) || 0));
            patch.discountPercent = pct;
            // Si se actualiza el percent, mantenemos enabled consistente
            const current = doc.data() || {};
            const enabled = discountEnabled !== undefined ? !!discountEnabled : !!current.discountEnabled;
            patch.discountEnabled = enabled && pct > 0;
        } else if (discountEnabled !== undefined) {
            const current = doc.data() || {};
            const pct = Math.max(0, Math.min(100, Number(current.discountPercent) || 0));
            patch.discountEnabled = !!discountEnabled && pct > 0;
        }

        if (discountStartAt !== undefined) {
            const startDate = parseOptionalDate(discountStartAt);
            patch.discountStartAt = toTimestampOrNull(admin, startDate);
        }

        if (discountEndAt !== undefined) {
            const endDate = parseOptionalDate(discountEndAt);
            patch.discountEndAt = toTimestampOrNull(admin, endDate);
        }

        if (patch.discountStartAt !== undefined || patch.discountEndAt !== undefined) {
            const current = doc.data() || {};
            const start = patch.discountStartAt === undefined ? current.discountStartAt : patch.discountStartAt;
            const end = patch.discountEndAt === undefined ? current.discountEndAt : patch.discountEndAt;
            const startMs = start?.toMillis ? start.toMillis() : null;
            const endMs = end?.toMillis ? end.toMillis() : null;
            if (startMs && endMs && endMs < startMs) {
                return res.status(400).json({ error: 'discountEndAt no puede ser anterior a discountStartAt' });
            }
        }

        await ref.set(patch, { merge: true });
        const updated = await ref.get();

        return res.json({
            product_id: updated.id,
            ...updated.data()
        });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
};

// Admin: eliminar definitivo
const deleteProduct = async (req, res) => {
    try {
        const id = req.params.product_id || req.params.id;
        if (!id) {
            return res.status(400).json({ error: 'Falta product_id' });
        }

        const db = getDb();
        const ref = db.collection('products').doc(id);
        const doc = await ref.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const data = doc.data() || {};
        if (data.isActive !== false) {
            return res.status(400).json({ error: 'Debes desactivar el producto antes de eliminarlo definitivamente.' });
        }

        await ref.delete();

        return res.json({ ok: true, deleted: true });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    adminListProducts,
    updateProduct,
    deleteProduct
};
