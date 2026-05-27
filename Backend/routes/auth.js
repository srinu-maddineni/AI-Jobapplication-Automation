const express = require('express');
const router = express.Router();
const { signup, login, verifyToken, getCredentials, saveCredentials } = require('../controllers/authController');
const authRateLimit = require('../middleware/authRateLimit');

router.post('/signup', authRateLimit, signup);
router.post('/login', authRateLimit, login);
router.get('/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});
router.get('/credentials', verifyToken, getCredentials);
router.post('/credentials', verifyToken, saveCredentials);

module.exports = router;
