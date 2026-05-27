const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const aiRateLimit = require('../middleware/aiRateLimit');
const aiController = require('../controllers/aiController');

router.use(authMiddleware);
router.use(aiRateLimit);

router.post('/analyze-resume', aiController.analyzeResume);
router.post('/analyze-job', aiController.analyzeJob);
router.post('/match', aiController.matchResumeJob);
router.post('/generate-cover-letter', aiController.generateCoverLetter);
router.post('/optimize-resume', aiController.optimizeResume);
router.post('/interview-questions', aiController.generateInterviewQuestions);
router.post('/chat', aiController.chat);
router.post('/company-domain', aiController.getCompanyDomain);

module.exports = router;
