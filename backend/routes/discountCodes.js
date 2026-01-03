const express = require('express');
const router = express.Router();
const { validateDiscountCode } = require('../controllers/discountCodeController');

router.get('/validate', validateDiscountCode);

module.exports = router;
