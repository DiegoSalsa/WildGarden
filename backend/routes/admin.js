const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateFirebaseToken, requireAdmin } = require('../middleware/firebaseAuth');
const { adminListOrders, adminUpdateOrderStatus, adminDeleteOrder } = require('../controllers/transactionController');
const { adminListProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { adminListNotices, adminCreateNotice, adminUpdateNotice, adminDeleteNotice } = require('../controllers/noticeController');
const {
	adminListDiscountCodes,
	adminCreateDiscountCode,
	adminUpdateDiscountCode,
	adminDeleteDiscountCode
} = require('../controllers/discountCodeController');
const { initCloudinary } = require('../config/cloudinary');

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 8 * 1024 * 1024 }
});

function uploadSingleImage(req, res, next) {
	upload.single('image')(req, res, (err) => {
		if (!err) return next();

		// Multer errors (e.g. LIMIT_FILE_SIZE) should not become a generic 500
		if (err && err.code === 'LIMIT_FILE_SIZE') {
			return res.status(413).json({ error: 'La imagen es muy pesada (máximo 8MB).' });
		}

		return res.status(400).json({ error: err?.message || 'Error al procesar la imagen.' });
	});
}

router.get('/orders', authenticateFirebaseToken, requireAdmin, adminListOrders);
router.patch('/orders/:order_id/status', authenticateFirebaseToken, requireAdmin, adminUpdateOrderStatus);
router.delete('/orders/:order_id', authenticateFirebaseToken, requireAdmin, adminDeleteOrder);

// Admin: avisos flotantes (CRUD)
router.get('/notices', authenticateFirebaseToken, requireAdmin, adminListNotices);
router.post('/notices', authenticateFirebaseToken, requireAdmin, adminCreateNotice);
router.patch('/notices/:notice_id', authenticateFirebaseToken, requireAdmin, adminUpdateNotice);
router.delete('/notices/:notice_id', authenticateFirebaseToken, requireAdmin, adminDeleteNotice);

// Admin: productos (CRUD)
router.get('/products', authenticateFirebaseToken, requireAdmin, adminListProducts);
router.post('/products', authenticateFirebaseToken, requireAdmin, createProduct);
router.patch('/products/:product_id', authenticateFirebaseToken, requireAdmin, updateProduct);
router.delete('/products/:product_id', authenticateFirebaseToken, requireAdmin, deleteProduct);

// Admin: códigos de descuento (CRUD)
router.get('/discount-codes', authenticateFirebaseToken, requireAdmin, adminListDiscountCodes);
router.post('/discount-codes', authenticateFirebaseToken, requireAdmin, adminCreateDiscountCode);
router.patch('/discount-codes/:code', authenticateFirebaseToken, requireAdmin, adminUpdateDiscountCode);
router.delete('/discount-codes/:code', authenticateFirebaseToken, requireAdmin, adminDeleteDiscountCode);

// Admin: subir imagen a Cloudinary
router.post('/upload', authenticateFirebaseToken, requireAdmin, uploadSingleImage, async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'Falta archivo image' });
		}

		if (req.file.mimetype && !String(req.file.mimetype).startsWith('image/')) {
			return res.status(400).json({ error: 'El archivo debe ser una imagen.' });
		}

		const cloudinary = initCloudinary();
		const folder = process.env.CLOUDINARY_FOLDER || 'wildgarden';

		const result = await new Promise((resolve, reject) => {
			const stream = cloudinary.uploader.upload_stream(
				{
					folder,
					resource_type: 'image'
				},
				(error, uploaded) => {
					if (error) return reject(error);
					resolve(uploaded);
				}
			);
			stream.end(req.file.buffer);
		});

		return res.json({
			url: result.secure_url,
			public_id: result.public_id,
			width: result.width,
			height: result.height
		});
	} catch (error) {
		console.error('Error al subir imagen a Cloudinary:', error);
		return res.status(500).json({ error: 'Error al subir imagen' });
	}
});

module.exports = router;
