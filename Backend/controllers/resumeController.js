const path = require('path');
const Resume = require('../models/Resume');
const { parseResumeFile } = require('../utils/parseResume');
const { extractSkillsFromText } = require('../utils/skillExtractor');

// Handles resume upload, parsing, and persistence.
const uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Resume file is required' });
  }

  try {
    const filePath = req.file.path;
    const extractedText = await parseResumeFile(filePath, req.file.originalname);
    const extractedSkills = extractSkillsFromText(extractedText);
    const resumeUrl = `/uploads/${req.file.filename}`;

    const resume = await Resume.create({
      userId: req.user.id,
      resumeUrl,
      originalFileName: req.file.originalname,
      extractedText,
      extractedSkills,
    });

    return res.status(201).json({
      message: 'Resume uploaded and parsed successfully',
      resume,
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    return res.status(500).json({
      message: 'Failed to process resume file',
      error: error.message,
    });
  }
};

// Returns all resumes uploaded by the authenticated user.
const getMyResume = async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(1);
    return res.json(resumes.length ? resumes[0] : null);
  } catch (error) {
    console.error('Get resume error:', error);
    return res.status(500).json({ message: 'Unable to fetch resumes' });
  }
};

// Deletes a user's resume by id.
const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    if (resume.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this resume' });
    }

    await resume.deleteOne();
    return res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    return res.status(500).json({ message: 'Unable to delete resume' });
  }
};

module.exports = {
  uploadResume,
  getMyResume,
  deleteResume,
};
