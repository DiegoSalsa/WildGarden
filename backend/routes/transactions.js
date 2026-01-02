const express = require('express');
const router = express.Router();
const { authenticateFirebaseToken, authenticateFirebaseTokenOptional } = require('../middleware/firebaseAuth');
const { createTransaction, getMyTransactions, getTransaction, updateTransactionStatus } = require('../controllers/transactionController');

router.post('/', authenticateFirebaseTokenOptional, createTransaction);
router.get('/my', authenticateFirebaseToken, getMyTransactions);
router.get('/:order_id', getTransaction);
router.patch('/:order_id/status', updateTransactionStatus);

module.exports = router;
