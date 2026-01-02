const express = require('express');
const router = express.Router();
const { authenticateFirebaseToken, requireAdmin } = require('../middleware/firebaseAuth');
const { adminListOrders, adminUpdateOrderStatus } = require('../controllers/transactionController');

router.get('/orders', authenticateFirebaseToken, requireAdmin, adminListOrders);
router.patch('/orders/:order_id/status', authenticateFirebaseToken, requireAdmin, adminUpdateOrderStatus);

module.exports = router;
