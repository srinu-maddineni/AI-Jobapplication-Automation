const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');

// Upload resume file and parse it.
router.post('/upload', authMiddleware, upload.single('resume'), resumeController.uploadResume);

// List resumes for the current authenticated user.
router.get('/my-resume', authMiddleware, resumeController.getMyResume);

// Delete a specific resume.
router.delete('/:id', authMiddleware, resumeController.deleteResume);

module.exports = router;
