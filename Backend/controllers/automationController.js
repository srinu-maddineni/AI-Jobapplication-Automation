const path = require('path');
const fs = require('fs');
const Resume = require('../models/Resume');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const emailService = require('../services/emailService');

const sendHREmail = async (req, res) => {
  try {
    const { jobId, toEmail, subject, body } = req.body;

    if (!jobId || !toEmail || !subject || !body) {
      return res.status(400).json({ message: 'jobId, toEmail, subject, and body are required.' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const resumeRecord = await Resume.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    if (!resumeRecord || !resumeRecord.resumeUrl) {
      return res.status(400).json({ message: 'Please upload a resume first before sending an email application.' });
    }

    const resumeFileName = path.basename(resumeRecord.resumeUrl);
    const resumePath = path.join(__dirname, '../uploads', resumeFileName);
    if (!fs.existsSync(resumePath)) {
      return res.status(400).json({ message: 'Your saved resume file is missing. Please upload your resume again.' });
    }

    const attachments = [{
      filename: resumeRecord.originalFileName || 'Resume.pdf',
      path: resumePath,
    }];

    const userProfile = await User.findById(req.user.id);
    let userSmtp = null;
    if (userProfile?.credentials?.google?.email && userProfile?.credentials?.google?.password) {
      userSmtp = {
        host: 'smtp.gmail.com',
        port: 587,
        user: userProfile.credentials.google.email,
        pass: userProfile.credentials.google.password,
        from: `"${userProfile.name || 'Job Applicant'}" <${userProfile.credentials.google.email}>`,
      };
    }

    const emailResult = await emailService.sendEmail({
      to: toEmail,
      subject,
      text: body,
      attachments,
      userSmtp,
    });

    let application = await Application.findOne({ userId: req.user.id, jobId: job._id });
    if (application) {
      application.emailSent = true;
      application.appliedSuccessfully = true;
      application.finalSubmitted = true;
      application.appliedAt = new Date();
      if (application.applied) application.status = 'COMPLETED';
      await application.save();
    } else {
      application = await Application.create({
        userId: req.user.id,
        jobId: job._id,
        company: job.company,
        title: job.title,
        platform: job.source || 'email',
        status: 'applied',
        emailSent: true,
        matchPercentage: job.recommendationScore || 0,
        appliedSuccessfully: true,
        finalSubmitted: true,
        appliedAt: new Date(),
      });
    }

    return res.status(200).json({
      message: emailResult.message,
      simulated: emailResult.simulated,
      application,
    });

  } catch (error) {
    console.error('sendHREmail error:', error);
    return res.status(500).json({ message: error.message || 'Failed to send email' });
  }
};

module.exports = { sendHREmail };
