const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
const corsOrigin = process.env.CORS_ORIGIN;
const allowedOrigins = new Set(
    (corsOrigin ? corsOrigin.split(',') : [])
        .map(s => s.trim())
        .filter(Boolean)
);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests (no Origin header)
        if (!origin) return callback(null, true);

        if (allowedOrigins.has(origin)) return callback(null, true);

        // Safe defaults for our deployments
        const isAllowedByPattern = [
            /^https?:\/\/localhost(?::\d+)?$/,
            /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
            /^https:\/\/.*\.vercel\.app$/,
            /^https:\/\/(www\.)?floreriawildgarden\.cl$/
        ].some((re) => re.test(origin));

        if (isAllowedByPattern) return callback(null, true);

        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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
