const pool = require('../config/database');

const createTransaction = async (req, res) => {
    try {
        const { order_id, amount, customer_name, customer_email, customer_phone, customer_address, customer_city, cart_items, payment_method } = req.body;
        
        const result = await pool.query(
            `INSERT INTO transactions (order_id, amount, customer_name, customer_email, customer_phone, customer_address, customer_city, cart_items, payment_method) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [order_id, amount, customer_name, customer_email, customer_phone, customer_address, customer_city, JSON.stringify(cart_items), payment_method]
        );
        
        // Insertar items de la orden
        for (const item of cart_items) {
            await pool.query(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [order_id, item.product_id, item.name, item.quantity, item.price, item.quantity * item.price]
            );
        }
        
        res.status(201).json({ 
            message: 'Transacción creada',
            transaction: result.rows[0]
        });
    } catch (error) {
        console.error('Error al crear transacción:', error);
        res.status(500).json({ error: 'Error al crear transacción' });
    }
};

const getTransaction = async (req, res) => {
    try {
        const { order_id } = req.params;
        
        const result = await pool.query('SELECT * FROM transactions WHERE order_id = $1', [order_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transacción no encontrada' });
        }
        
        const transaction = result.rows[0];
        
        // Obtener items de la orden
        const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order_id]);
        
        res.json({
            ...transaction,
            items: itemsResult.rows
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
        
        const result = await pool.query(
            'UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2 RETURNING *',
            [status, order_id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transacción no encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar transacción:', error);
        res.status(500).json({ error: 'Error al actualizar transacción' });
    }
};

module.exports = {
    createTransaction,
    getTransaction,
    updateTransactionStatus
};
