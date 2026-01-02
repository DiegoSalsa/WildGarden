const { getDb, initFirebaseAdmin } = require('../config/firebaseAdmin');

const getMyTransactions = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const email = req.user?.email;

        if (!uid && !email) {
            return res.status(400).json({ error: 'Usuario inválido' });
        }

        const db = getDb();

        // Prefer userId; fallback to email if needed
        let snap;
        if (uid) {
            snap = await db.collection('orders').where('userId', '==', uid).orderBy('createdAt', 'desc').get();
        } else {
            snap = await db.collection('orders').where('customerEmail', '==', email).orderBy('createdAt', 'desc').get();
        }

        const transactions = snap.docs.map(d => ({
            order_id: d.id,
            ...d.data()
        }));

        res.json({ transactions });
    } catch (error) {
        console.error('Error al obtener transacciones del usuario:', error);
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
};

const createTransaction = async (req, res) => {
    try {
        const { order_id, amount, customer_name, customer_email, customer_phone, customer_address, customer_city, cart_items, payment_method } = req.body;

        const admin = initFirebaseAdmin();
        const db = getDb();

        const uid = req.user?.uid || null;

        const id = order_id || db.collection('orders').doc().id;
        const items = Array.isArray(cart_items)
            ? cart_items.map(i => ({
                productId: i.product_id,
                name: i.name,
                quantity: Number(i.quantity) || 0,
                price: Number(i.price) || 0
            }))
            : [];

        const order = {
            userId: uid,
            amount: Number(amount) || 0,
            customerName: customer_name || '',
            customerEmail: customer_email || '',
            customerPhone: customer_phone || '',
            customerAddress: customer_address || '',
            customerCity: customer_city || '',
            items,
            paymentMethod: payment_method || 'webpay',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('orders').doc(id).set(order);

        res.status(201).json({ 
            message: 'Transacción creada',
            transaction: { order_id: id, ...order }
        });
    } catch (error) {
        console.error('Error al crear transacción:', error);
        res.status(500).json({ error: 'Error al crear transacción' });
    }
};

const getTransaction = async (req, res) => {
    try {
        const { order_id } = req.params;

        const db = getDb();
        const doc = await db.collection('orders').doc(order_id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Transacción no encontrada' });
        }

        const data = doc.data();
        res.json({
            order_id: doc.id,
            ...data,
            items: data.items || []
        });
    } catch (error) {
        console.error('Error al obtener transacción:', error);
        res.status(500).json({ error: 'Error al obtener transacción' });
    }
};

const updateTransactionStatus = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }
        
        const admin = initFirebaseAdmin();
        const db = getDb();
        const ref = db.collection('orders').doc(order_id);
        const existing = await ref.get();
        if (!existing.exists) {
            return res.status(404).json({ error: 'Transacción no encontrada' });
        }

        await ref.set(
            {
                status,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
        );

        const updated = await ref.get();
        res.json({ order_id: updated.id, ...updated.data() });
    } catch (error) {
        console.error('Error al actualizar transacción:', error);
        res.status(500).json({ error: 'Error al actualizar transacción' });
    }
};

// Admin: listar todos los pedidos
const adminListOrders = async (req, res) => {
    try {
        const db = getDb();
        const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(200).get();
        const orders = snap.docs.map(d => ({ order_id: d.id, ...d.data() }));
        res.json({ orders });
    } catch (error) {
        console.error('Error al listar pedidos (admin):', error);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
};

// Admin: actualizar estado pedido
const adminUpdateOrderStatus = async (req, res) => {
    return updateTransactionStatus(req, res);
};

module.exports = {
    createTransaction,
    getMyTransactions,
    getTransaction,
    updateTransactionStatus,
    adminListOrders,
    adminUpdateOrderStatus
};
