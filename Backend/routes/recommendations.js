const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const recommendationsController = require('../controllers/recommendationsController');

router.get('/', authMiddleware, recommendationsController.getRecommendations);

module.exports = router;
