const Application = require('../models/Application');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const { compareSkills } = require('../utils/jobMatcher');
const { emitSocketEvent } = require('../utils/socketService');

const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required to apply' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const resume = await Resume.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    if (!resume || !resume.extractedSkills.length) {
      return res.status(400).json({ message: 'Upload a resume before applying to jobs' });
    }

    let application = await Application.findOne({ userId: req.user.id, jobId });
    const matchResult = compareSkills(resume.extractedSkills, job.requiredSkills);

    if (application) {
      if (application.applied) {
        return res.status(409).json({ message: 'You have already applied to this job' });
      }
      application.applied = true;
      application.appliedSuccessfully = true;
      if (application.emailSent) {
        application.status = 'COMPLETED';
      }
      await application.save();
    } else {
      application = await Application.create({
        userId: req.user.id,
        jobId,
        company: job.company,
        title: job.title,
        platform: job.platform || 'manual',
        status: 'applied',
        applied: true,
        appliedSuccessfully: true,
        matchPercentage: matchResult.matchPercentage,
      });
    }

    emitSocketEvent('application:created', {
      applicationId: application._id.toString(),
      jobId: jobId.toString(),
      userId: req.user.id.toString(),
    });

    return res.status(201).json({
      message: 'Application recorded successfully',
      application,
      match: matchResult,
    });
  } catch (error) {
    console.error('Apply to job error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already applied to this job' });
    }
    return res.status(500).json({ message: 'Unable to apply to job' });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, company, minMatch = 0, location, skills } = req.query;
    const parsedPage = Math.max(parseInt(page, 10), 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100);
    const normalizedMinMatch = Math.max(parseInt(minMatch, 10) || 0, 0);

    const filter = { userId: req.user.id };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('jobId')
      .sort({ appliedAt: -1 });

    const filtered = applications.filter((application) => {
      if (application.matchPercentage < normalizedMinMatch) return false;
      if (company && !new RegExp(company, 'i').test(application.jobId?.company)) return false;
      if (location && !new RegExp(location, 'i').test(application.jobId?.location)) return false;
      if (skills) {
        const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
        if (skillList.length) {
          return skillList.some(skill =>
            (application.jobId?.requiredSkills || []).some(req =>
              new RegExp(skill, 'i').test(req)
            )
          );
        }
      }
      return true;
    });

    const total = filtered.length;
    const paginated = filtered.slice((parsedPage - 1) * parsedLimit, parsedPage * parsedLimit);

    return res.json({
      applications: paginated.map(app => app.toObject()),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error('Get applications error:', error);
    return res.status(500).json({ message: 'Unable to fetch applications' });
  }
};

module.exports = {
  applyToJob,
  getMyApplications,
};
