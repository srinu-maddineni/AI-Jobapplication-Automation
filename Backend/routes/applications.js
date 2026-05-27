const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const applicationsController = require('../controllers/applicationsController');

router.post('/apply', authMiddleware, applicationsController.applyToJob);
router.get('/my-applications', authMiddleware, applicationsController.getMyApplications);

module.exports = router;

