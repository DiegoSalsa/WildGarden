const { getDb, initFirebaseAdmin } = require('../config/firebaseAdmin');
const { sendOrderConfirmationEmail } = require('../services/emailService');

const getMyTransactions = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const email = req.user?.email;

        if (!uid && !email) {
            return res.status(400).json({ error: 'Usuario inválido' });
        }

        const db = getDb();

        // Traer por userId y/o por email (algunos pedidos pueden haberse creado sin userId)
        const byIdPromise = uid
            ? db.collection('orders').where('userId', '==', uid).limit(200).get()
            : Promise.resolve(null);
        const byEmailPromise = email
            ? db.collection('orders').where('customerEmail', '==', email).limit(200).get()
            : Promise.resolve(null);

        const [byIdSnap, byEmailSnap] = await Promise.all([byIdPromise, byEmailPromise]);

        const map = new Map();
        for (const snap of [byIdSnap, byEmailSnap]) {
            if (!snap) continue;
            for (const d of snap.docs) {
                map.set(d.id, { order_id: d.id, ...d.data() });
            }
        }

        const transactions = Array.from(map.values()).sort((a, b) => {
            const aSec = a?.createdAt?.seconds ? Number(a.createdAt.seconds) : 0;
            const bSec = b?.createdAt?.seconds ? Number(b.createdAt.seconds) : 0;
            return bSec - aSec;
        });

        res.json({ transactions });
    } catch (error) {
        console.error('Error al obtener transacciones del usuario:', error);
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
};

const createTransaction = async (req, res) => {
    try {
        const {
            order_id,
            amount,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            customer_city,
            cart_items,
            payment_method,
            needs_shipping,
            shipping_cost,
            delivery_date,
            delivery_time,
            delivery_notes
        } = req.body;

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
            needsShipping: !!needs_shipping,
            shippingCost: Number(shipping_cost) || 0,
            deliveryDate: delivery_date || '',
            deliveryTime: delivery_time || '',
            deliveryNotes: delivery_notes || '',
            items,
            paymentMethod: payment_method || 'webpay',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('orders').doc(id).set(order);

        // Enviar confirmación por correo (no bloquea ni rompe la creación si falla)
        void (async () => {
            try {
                if (!order.customerEmail) return;

                const orderRef = db.collection('orders').doc(id);
                await orderRef.set(
                    {
                        emailStatus: {
                            confirmation: {
                                status: 'sending',
                                updatedAt: admin.firestore.FieldValue.serverTimestamp()
                            }
                        }
                    },
                    { merge: true }
                );

                const result = await sendOrderConfirmationEmail({ orderId: id, order });

                await orderRef.set(
                    {
                        emailStatus: {
                            confirmation: {
                                status: 'sent',
                                messageId: result?.data?.id || null,
                                sentAt: admin.firestore.FieldValue.serverTimestamp()
                            }
                        }
                    },
                    { merge: true }
                );
            } catch (err) {
                console.error('Order confirmation email error:', err);
                try {
                    await db.collection('orders').doc(id).set(
                        {
                            emailStatus: {
                                confirmation: {
                                    status: 'error',
                                    error: String(err?.message || err),
                                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                                }
                            }
                        },
                        { merge: true }
                    );
                } catch (e) {
                    console.error('Order confirmation status update error:', e);
                }
            }
        })();

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

// Admin: eliminar pedido definitivamente
const adminDeleteOrder = async (req, res) => {
    try {
        const { order_id } = req.params;
        if (!order_id) {
            return res.status(400).json({ error: 'Falta order_id' });
        }

        const db = getDb();
        const ref = db.collection('orders').doc(order_id);
        const existing = await ref.get();
        if (!existing.exists) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        await ref.delete();
        return res.json({ message: 'Pedido eliminado', order_id });
    } catch (error) {
        console.error('Error al eliminar pedido (admin):', error);
        return res.status(500).json({ error: 'Error al eliminar pedido' });
    }
};

module.exports = {
    createTransaction,
    getMyTransactions,
    getTransaction,
    updateTransactionStatus,
    adminListOrders,
    adminUpdateOrderStatus,
    adminDeleteOrder
};
