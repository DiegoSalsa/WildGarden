const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateFirebaseToken, requireAdmin } = require('../middleware/firebaseAuth');
const { adminListOrders, adminUpdateOrderStatus } = require('../controllers/transactionController');
const { initCloudinary } = require('../config/cloudinary');

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 8 * 1024 * 1024 }
});

router.get('/orders', authenticateFirebaseToken, requireAdmin, adminListOrders);
router.patch('/orders/:order_id/status', authenticateFirebaseToken, requireAdmin, adminUpdateOrderStatus);

// Admin: subir imagen a Cloudinary
router.post('/upload', authenticateFirebaseToken, requireAdmin, upload.single('image'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'Falta archivo image' });
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
