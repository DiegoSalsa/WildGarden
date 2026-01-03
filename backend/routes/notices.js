const express = require('express');
const router = express.Router();

const { listActiveNotices } = require('../controllers/noticeController');

// Public: obtener avisos activos (para banner flotante)
router.get('/active', listActiveNotices);

module.exports = router;
