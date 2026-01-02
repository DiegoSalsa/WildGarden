const { getDb, initFirebaseAdmin } = require('../config/firebaseAdmin');

const getProducts = async (req, res) => {
    try {
        const db = getDb();
        const snap = await db
            .collection('products')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .get();

        const products = snap.docs.map(d => ({
            product_id: d.id,
            ...d.data()
        }));

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

        res.json({
            product_id: doc.id,
            ...doc.data()
        });
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
};

const createProduct = async (req, res) => {
    try {
        const { product_id, name, description, price, category, image_url } = req.body;

        const admin = initFirebaseAdmin();
        const db = getDb();
        const id = product_id || db.collection('products').doc().id;

        const payload = {
            name: name || '',
            description: description || '',
            price: Number(price) || 0,
            category: category || '',
            image_url: image_url || '',
            isActive: true,
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

module.exports = {
    getProducts,
    getProductById,
    createProduct
};
