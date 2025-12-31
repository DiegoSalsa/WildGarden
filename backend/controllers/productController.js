const pool = require('../config/database');

const getProducts = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM products WHERE product_id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
};

const createProduct = async (req, res) => {
    try {
        const { product_id, name, description, price, category, image_url } = req.body;
        
        const result = await pool.query(
            'INSERT INTO products (product_id, name, description, price, category, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [product_id, name, description, price, category, image_url]
        );
        
        res.status(201).json(result.rows[0]);
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
