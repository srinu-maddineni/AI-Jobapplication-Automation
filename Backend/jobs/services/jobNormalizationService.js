const { extractSkillsFromText } = require('../../utils/jobMatcher');
const { generateJobHash } = require('../utils/jobHash');
const { detectSupportedPlatform } = require('../utils/platformDetector');
const { isIndiaRelevant, isSpamOrStaffing } = require('../utils/indiaFilters');
const { isAutomationPlatform } = require('../constants/automationPlatforms');

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Normalize raw provider job; returns null if filtered out.
 * Platform detection is sync from URL only; async resolution happens in jobService.
 */
const normalizeJobSync = (job) => {
  const candidate = {
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    country: job.country,
    remote: job.remote,
  };

  if (!isIndiaRelevant(candidate)) {
    return null;
  }

  if (isSpamOrStaffing(candidate)) {
    return null;
  }

  const cleanDescription = stripHtml(job.description || '');
  const description =
    cleanDescription.length > 800 ? `${cleanDescription.substring(0, 800)}...` : cleanDescription;

  const applyUrl = job.applyUrl || job.jobUrl || '';
  const platformFromUrl = applyUrl.toLowerCase();
  let platform = job.platform || 'other';

  if (platformFromUrl.includes('greenhouse')) platform = 'greenhouse';
  else if (platformFromUrl.includes('lever.co')) platform = 'lever';
  else if (platformFromUrl.includes('ashby')) platform = 'ashby';
  else if (platformFromUrl.includes('smartrecruiters')) platform = 'smartrecruiters';
  else if (platformFromUrl.includes('workday')) platform = 'workday';

  const jobHash = generateJobHash({
    title: job.title,
    company: job.company,
    location: job.location,
  });

  let country = job.country || '';
  if (!country || country.toLowerCase() === 'null') {
    const locLower = String(job.location || '').toLowerCase();
    if (locLower.includes('india') || locLower.includes('bangalore') || locLower.includes('bengaluru') || locLower.includes('hyderabad') || locLower.includes('pune') || locLower.includes('mumbai') || locLower.includes('chennai') || locLower.includes('delhi') || locLower.includes('noida') || locLower.includes('gurgaon')) {
      country = 'IN';
    } else if (locLower.includes('united states') || locLower.includes(', us') || locLower.includes(', ca') || locLower.includes(', ny') || locLower.includes(', tx') || locLower.includes(', sf') || locLower.includes('san francisco') || locLower.includes('new york') || locLower.includes('seattle') || locLower.includes('boston') || locLower.includes('chicago') || locLower.includes('austin')) {
      country = 'US';
    } else if (locLower.includes('germany') || locLower.includes('berlin') || locLower.includes('hamburg') || locLower.includes('munich') || locLower.includes('deutschland')) {
      country = 'DE';
    } else if (locLower.includes('uk') || locLower.includes('united kingdom') || locLower.includes('london')) {
      country = 'GB';
    } else {
      country = isIndiaRelevant(candidate) && process.env.ALLOW_GLOBAL_JOBS !== 'true' ? 'IN' : '';
    }
  }

  const defaultLocation = process.env.ALLOW_GLOBAL_JOBS === 'true' ? 'Remote' : 'India';

  return {
    source: job.source || 'Unknown',
    externalJobId: String(job.externalJobId || jobHash),
    title: (job.title || 'Untitled Job').trim(),
    company: (job.company || 'Unknown').trim(),
    location: (job.location || defaultLocation).trim(),
    salary: (job.salary || '').trim(),
    description,
    applyUrl,
    jobUrl: applyUrl,
    remote: Boolean(job.remote),
    tags: Array.isArray(job.tags) ? job.tags : [],
    platform,
    postedAt: job.postedAt ? new Date(job.postedAt) : new Date(),
    metadata: job.metadata || {},
    requiredSkills: extractSkillsFromText(cleanDescription),
    country,
    applyUrlResolved: applyUrl,
    automationSupported: isAutomationPlatform(platform),
    jobHash,
    missingSkills: [],
    recommendationScore: 0,
  };
};

/**
 * Full async normalization with redirect-based platform detection.
 */
const normalizeJob = async (job) => {
  const base = normalizeJobSync(job);
  if (!base) {
    return null;
  }

  const applyUrl = base.applyUrl;
  if (applyUrl) {
    const detection = await detectSupportedPlatform(applyUrl);
    if (detection.platform !== 'other') {
      base.platform = detection.platform;
      base.applyUrlResolved = detection.url || applyUrl;
      base.jobUrl = base.applyUrlResolved;
      base.applyUrl = base.applyUrlResolved;
      base.automationSupported = Boolean(detection.automationSupported);
      if (base.automationSupported) {
        base.source = detection.platform;
      }
    }
  }

  return base;
};

module.exports = {
  normalizeJob,
  normalizeJobSync,
};
