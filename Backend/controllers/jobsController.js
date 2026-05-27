const Job = require('../models/Job');
const Resume = require('../models/Resume');
const Application = require('../models/Application');
const { fetchJobsFromExternalApi } = require('../services/jobService');
const { compareSkills } = require('../utils/jobMatcher');
const { scoreJobWithAI } = require('../services/jobRecommendationEngine');
const { isAutomationPlatform } = require('../jobs/constants/automationPlatforms');
const { ensureJobsAvailable, buildIndiaFilter } = require('../jobs/services/jobAvailabilityService');
const { runWithLock, getIngestionStatus } = require('../jobs/services/startupIngestionService');
const { getLastMetrics } = require('../jobs/services/ingestionMetrics');
const logger = require('../utils/logger');

const isMockJob = (job) => {
  if (!job) return false;
  const title = String(job.title || '').toLowerCase();
  const company = String(job.company || '').toLowerCase();
  const jobUrl = String(job.jobUrl || job.applyUrl || job.applyUrlResolved || '').toLowerCase();
  return (
    title.includes('mock') || title.includes('smoke') || title.includes('test') || title.includes('example') ||
    company.includes('mock') || company.includes('smoke') || company.includes('test') || company.includes('example') ||
    jobUrl.includes('host.docker.internal') || jobUrl.includes('example.com')
  );
};

const buildQueryFilterWithoutMock = (baseFilter = {}) => {
  const mockFilters = [
    { title: { $not: /mock|smoke|test|example/i } },
    { company: { $not: /mock|smoke|test|example/i } },
    { jobUrl: { $not: /host\.docker\.internal|example\.com/i } }
  ];
  return {
    $and: [
      baseFilter,
      ...mockFilters
    ]
  };
};

const enrichJobDocument = (job) => {
  const doc = job?.toObject ? job.toObject() : job;
  const automationSupported =
    Boolean(doc.automationSupported) || isAutomationPlatform(doc.platform);

  return {
    ...doc,
    automationSupported,
    platform: doc.platform || 'other',
    country: doc.country || '',
    applyUrlResolved: doc.applyUrlResolved || doc.applyUrl || doc.jobUrl,
  };
};

const upsertFetchedJob = async (jobData) => {
  if (isMockJob(jobData)) {
    logger.info(`Skipping upsert of mock/test job: ${jobData.title} @ ${jobData.company}`);
    return null;
  }
  const filter = {
    $or: [
      { jobHash: jobData.jobHash },
      { source: jobData.source, externalJobId: jobData.externalJobId }
    ]
  };

  return Job.findOneAndUpdate(filter, { $set: jobData }, { upsert: true, new: true, setDefaultsOnInsert: true });
};

const buildSearchFilter = (skills, location, company, source, remote, salary, postedWithin, appliedJobIds = []) => {
  const conditions = [];

  if (appliedJobIds && appliedJobIds.length > 0) {
    conditions.push({ _id: { $nin: appliedJobIds } });
  }

  if (company) {
    conditions.push({ company: { $regex: company, $options: 'i' } });
  }
  if (source) {
    conditions.push({ source: { $regex: source, $options: 'i' } });
  } else {
    conditions.push({ source: { $in: ['LinkedIn', 'Naukri', 'Indeed', 'Unstop', 'Internshala'] } });
  }
  if (remote === 'true' || remote === true) {
    conditions.push({ remote: true });
  }

  if (location) {
    // Match on location field, country field, OR remote jobs (so "India" filter still shows remote-friendly roles)
    conditions.push({
      $or: [
        { location: { $regex: location, $options: 'i' } },
        { country: { $regex: location, $options: 'i' } },
        { remote: true },
      ]
    });
  }

  if (skills) {
    const terms = skills.split(/[\s,]+/).filter((t) => t.length > 1);
    if (terms.length > 0) {
      conditions.push({
        $or: terms.flatMap((term) => [
          { title: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
          { tags: { $regex: term, $options: 'i' } }
        ])
      });
    }
  }

  if (salary) {
    conditions.push({ salary: { $regex: salary, $options: 'i' } });
  }

  if (postedWithin && postedWithin !== 'all') {
    const cutoff = new Date();
    if (postedWithin === '24h' || postedWithin === '1d') {
      cutoff.setHours(cutoff.getHours() - 24);
    } else if (postedWithin === '7d' || postedWithin === 'week') {
      cutoff.setDate(cutoff.getDate() - 7);
    } else if (postedWithin === '14d') {
      cutoff.setDate(cutoff.getDate() - 14);
    } else if (postedWithin === '30d' || postedWithin === 'month') {
      cutoff.setDate(cutoff.getDate() - 30);
    }
    conditions.push({ createdAt: { $gte: cutoff } });
  }

  const baseFilter = conditions.length > 0 ? { $and: conditions } : {};
  return buildQueryFilterWithoutMock(baseFilter);
};

const buildRecommendationItem = (req, userResume, job) => {
  const enrichedJob = enrichJobDocument(job);
  const aiMatch = scoreJobWithAI(req.user, userResume, job, {});
  const automationSupported =
    enrichedJob.automationSupported || Boolean(aiMatch.autoApplyEligible);

  return {
    job: enrichedJob,
    matchScore: aiMatch.matchScore,
    recommendationReason: aiMatch.recommendationReason,
    missingSkills: aiMatch.missingSkills,
    confidenceScore: aiMatch.confidenceScore,
    autoApplyEligible: aiMatch.autoApplyEligible,
    automationSupported,
    atsCompatibilityScore: aiMatch.atsCompatibilityScore,
    applySuccessProbability: aiMatch.applySuccessProbability,
  };
};

const getJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, location, skills, company, source, salary, postedWithin } = req.query;
    const parsedPage = Math.max(parseInt(page, 10), 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100);

    // Exclude jobs the user has completed BOTH manual/auto apply AND emailed HR for
    const completedApps = await Application.find({ userId: req.user.id, applied: true, emailSent: true }).select('jobId');
    const excludedJobIds = completedApps.map(app => app.jobId);

    const filter = buildSearchFilter(skills, location, company, source, null, salary, postedWithin, excludedJobIds);
    let count = await Job.countDocuments(filter);

    // If no matching jobs are in the database, fetch from live API first
    if (count === 0 && (skills || location)) {
      logger.info('No jobs in DB matching query. Triggering live fetch.', { skills, location });
      const defaultLoc = process.env.ALLOW_GLOBAL_JOBS === 'true' ? '' : 'India';
      const fetchedJobs = await fetchJobsFromExternalApi(skills || 'software engineer', location || defaultLoc, 30);
      for (const jobData of fetchedJobs) {
        if (!isMockJob(jobData)) {
          await upsertFetchedJob(jobData);
        }
      }
      count = await Job.countDocuments(filter);
    }

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return res.json({
      jobs: jobs.map(enrichJobDocument),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: count,
        totalPages: Math.ceil(count / parsedLimit) || 1,
      },
    });
  } catch (error) {
    logger.error('Get jobs error', { error: error.message });
    return res.status(500).json({ message: 'Unable to fetch jobs' });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    return res.json({ job: enrichJobDocument(job) });
  } catch (error) {
    logger.error('Get job by id error', { error: error.message });
    return res.status(500).json({ message: 'Unable to fetch job' });
  }
};

const fetchJobs = async (req, res) => {
  try {
    const { keywords, location, limit = 20 } = req.body;
    if (!keywords || typeof keywords !== 'string') {
      return res.status(400).json({ message: 'Keywords are required to fetch jobs' });
    }

    const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const defaultLoc = process.env.ALLOW_GLOBAL_JOBS === 'true' ? '' : 'India';
    const fetchedJobs = await fetchJobsFromExternalApi(keywords, location || defaultLoc, normalizedLimit);

    let storedCount = 0;
    const savedJobs = [];

    for (const jobData of fetchedJobs) {
      const updated = await upsertFetchedJob(jobData);
      savedJobs.push(updated);
      storedCount += 1;
    }

    return res.status(201).json({
      message: 'Jobs fetched and stored successfully',
      count: storedCount,
      jobs: savedJobs,
    });
  } catch (error) {
    logger.error('Fetch jobs error', { error: error.message });
    return res.status(500).json({ message: error.message || 'Failed to fetch jobs' });
  }
};

const syncJobs = async (req, res) => {
  try {
    const { keywords, location } = req.body;
    const result = await runWithLock('manual_sync', keywords, location);
    if (result?.skipped) {
      return res.status(409).json({
        message: 'Job sync already in progress. Please wait.',
        status: getIngestionStatus(),
      });
    }
    return res.json({
      message: 'Job sync completed',
      result,
      metrics: getLastMetrics(),
    });
  } catch (error) {
    logger.error('Manual job sync failed', { error: error.message });
    return res.status(500).json({ message: 'Job sync failed', error: error.message });
  }
};

const getSyncStatus = async (req, res) => {
  return res.json({
    status: getIngestionStatus(),
    metrics: getLastMetrics(),
    jobCount: await Job.countDocuments({}),
  });
};

const getMatchedJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, location, skills, company, minMatch = 0, salary, postedWithin } = req.query;
    const userResume = await Resume.findOne({ userId: req.user.id }).sort({ createdAt: -1 });

    if (!userResume || !userResume.extractedSkills.length) {
      return res.json({
        matchedJobs: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    }

    const parsedPage = Math.max(parseInt(page, 10), 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100);
    const normalizedMinMatch = Math.max(parseInt(minMatch, 10) || 0, 0);

    const keywords = skills || userResume.extractedSkills.slice(0, 3).join(' ');

    // Exclude jobs the user has completed BOTH manual/auto apply AND emailed HR for
    const completedApps = await Application.find({ userId: req.user.id, applied: true, emailSent: true }).select('jobId');
    const excludedJobIds = completedApps.map(app => app.jobId);

    const filter = buildSearchFilter(keywords, location, company, null, null, salary, postedWithin, excludedJobIds);
    let count = await Job.countDocuments(filter);

    // If no matching jobs are in the database, fetch from live API first
    if (count === 0) {
      logger.info('No matched jobs in DB matching query. Triggering live fetch.', { keywords, location });
      const defaultLoc = process.env.ALLOW_GLOBAL_JOBS === 'true' ? '' : 'India';
      const fetchedJobs = await fetchJobsFromExternalApi(keywords, location || defaultLoc, 30);
      for (const jobData of fetchedJobs) {
        if (!isMockJob(jobData)) {
          await upsertFetchedJob(jobData);
        }
      }
    }

    const jobs = await Job.find(filter).sort({ createdAt: -1 });

    const matchedJobs = jobs
      .map((job) => {
        const jobMatch = compareSkills(userResume.extractedSkills, job.requiredSkills);
        return {
          job: enrichJobDocument(job),
          matchPercentage: jobMatch.matchPercentage,
          matchedSkills: jobMatch.matchedSkills,
          missingSkills: jobMatch.missingSkills,
        };
      })
      .filter((item) => item.matchPercentage >= normalizedMinMatch)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

    const total = matchedJobs.length;
    const paged = matchedJobs.slice((parsedPage - 1) * parsedLimit, parsedPage * parsedLimit);

    return res.json({
      matchedJobs: paged,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit) || 1,
      },
    });
  } catch (error) {
    logger.error('Matched jobs error', { error: error.message });
    return res.status(500).json({ message: 'Unable to fetch matched jobs' });
  }
};

const getRecommendations = async (req, res) => {
  try {
    const { page = 1, limit = 10, location, skills, company, minScore = 0, remote, sortBy = 'matchScore', salary, postedWithin } = req.query;
    const userResume = await Resume.findOne({ userId: req.user.id }).sort({ createdAt: -1 });

    const parsedPage = Math.max(parseInt(page, 10), 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100);
    const normalizedMinScore = Math.max(parseInt(minScore, 10) || 0, 0);

    const keywords = skills || (userResume?.extractedSkills && userResume.extractedSkills.slice(0, 3).join(' ')) || '';

    // Exclude jobs the user has completed BOTH manual/auto apply AND emailed HR for
    const completedApps = await Application.find({ userId: req.user.id, applied: true, emailSent: true }).select('jobId');
    const excludedJobIds = completedApps.map(app => app.jobId);

    const filter = buildSearchFilter(keywords, location, company, null, remote, salary, postedWithin, excludedJobIds);
    let count = await Job.countDocuments(filter);

    // If no matching recommendations are in the database, fetch from live API first
    if (count === 0 && keywords) {
      logger.info('No recommendations in DB matching query. Triggering live fetch.', { keywords, location });
      const fetchedJobs = await fetchJobsFromExternalApi(keywords, location || '', 30);
      for (const jobData of fetchedJobs) {
        if (!isMockJob(jobData)) {
          await upsertFetchedJob(jobData);
        }
      }
      count = await Job.countDocuments(filter);
    }

    // Sort by newest first so recently synced jobs appear at the top
    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .limit(500); // cap to avoid huge in-memory sorts

    const recommendations = jobs
      .map((job) => buildRecommendationItem(req, userResume, job))
      .filter((rec) => rec.matchScore >= normalizedMinScore);

    if (sortBy === 'date') {
      recommendations.sort((a, b) => new Date(b.job?.createdAt || b.job?.postedAt || 0) - new Date(a.job?.createdAt || a.job?.postedAt || 0) || b.matchScore - a.matchScore);
    } else {
      recommendations.sort((a, b) => b.matchScore - a.matchScore || new Date(b.job?.createdAt || b.job?.postedAt || 0) - new Date(a.job?.createdAt || a.job?.postedAt || 0));
    }

    const total = recommendations.length;
    const paged = recommendations.slice((parsedPage - 1) * parsedLimit, parsedPage * parsedLimit);

    return res.json({
      recommendations: paged,
      sync: { synced: count === 0, jobCount: jobs.length },
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit) || 1,
      },
    });
  } catch (error) {
    logger.error('Recommendations error', { error: error.message });
    return res.status(500).json({ message: 'Unable to fetch recommendations' });
  }
};

module.exports = {
  getJobs,
  getJobById,
  fetchJobs,
  syncJobs,
  getSyncStatus,
  getMatchedJobs,
  getRecommendations,
};
