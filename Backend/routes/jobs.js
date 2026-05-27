const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const jobsController = require('../controllers/jobsController');

router.get('/', authMiddleware, jobsController.getJobs);
router.get('/matched', authMiddleware, jobsController.getMatchedJobs);
router.get('/recommendations', authMiddleware, jobsController.getRecommendations);
router.get('/sync/status', authMiddleware, jobsController.getSyncStatus);
router.post('/sync', authMiddleware, jobsController.syncJobs);
router.get('/:id', authMiddleware, jobsController.getJobById);
router.post('/fetch', authMiddleware, jobsController.fetchJobs);

module.exports = router;
