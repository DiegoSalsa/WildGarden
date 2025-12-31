const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
    const allowedOrigins = corsOrigin.split(',').map(s => s.trim()).filter(Boolean);
    app.use(cors({ origin: allowedOrigins }));
} else {
    app.use(cors());
}
app.use(express.json());

// Rutas
app.use('/api/products', require('./routes/products'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend running' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
