const express = require('express');
const router = express.Router();
const { createTransaction, getTransaction, updateTransactionStatus } = require('../controllers/transactionController');

router.post('/', createTransaction);
router.get('/:order_id', getTransaction);
router.patch('/:order_id/status', updateTransactionStatus);

module.exports = router;
