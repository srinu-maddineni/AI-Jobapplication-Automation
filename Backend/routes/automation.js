const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const automationController = require('../controllers/automationController');

router.post('/send-hr-email', authMiddleware, automationController.sendHREmail);

module.exports = router;
