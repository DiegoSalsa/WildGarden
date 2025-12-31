const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { createTransaction, getMyTransactions, getTransaction, updateTransactionStatus } = require('../controllers/transactionController');

router.post('/', createTransaction);
router.get('/my', authenticateToken, getMyTransactions);
router.get('/:order_id', getTransaction);
router.patch('/:order_id/status', updateTransactionStatus);

module.exports = router;
