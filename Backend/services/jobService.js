const { extractSkillsFromText } = require('../utils/jobMatcher');
const linkedinScraper = require('../jobs/providers/linkedinScraperProvider');
const naukriScraper = require('../jobs/providers/naukriScraperProvider');
const indeedScraper = require('../jobs/providers/indeedScraperProvider');
const unstopScraper = require('../jobs/providers/unstopScraperProvider');
const { normalizeJob } = require('../jobs/services/jobNormalizationService');
const { isIndiaRelevant, isSpamOrStaffing } = require('../jobs/utils/indiaFilters');
const { generateJobHash } = require('../jobs/utils/jobHash');
const { detectSupportedPlatform } = require('../jobs/utils/platformDetector');

const normalizeText = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * On-demand fetch: LinkedIn, Naukri, Indeed, and Unstop.
 * Applies India + spam filters and ATS platform resolution.
 */
const fetchJobsFromExternalApi = async (keywords, location, limit = 30) => {
  const effectiveLocation = location || (process.env.ALLOW_GLOBAL_JOBS === 'true' ? '' : 'India');
  const keywordQuery = keywords || 'software engineer';

  const [
    linkedinJobs,
    naukriJobs,
    indeedJobs,
    unstopJobs
  ] = await Promise.all([
    linkedinScraper.fetchJobs(keywordQuery, effectiveLocation),
    naukriScraper.fetchJobs(keywordQuery, effectiveLocation),
    indeedScraper.fetchJobs(keywordQuery, effectiveLocation),
    unstopScraper.fetchJobs(keywordQuery, effectiveLocation),
  ]);

  let allRawJobs = [
    ...linkedinJobs,
    ...naukriJobs,
    ...indeedJobs,
    ...unstopJobs
  ];

  // Keyword filter
  if (keywordQuery) {
    const terms = keywordQuery.toLowerCase().split(/[\s,]+/).filter((t) => t.length > 1);
    if (terms.length > 0) {
      allRawJobs = allRawJobs.filter((job) => {
        const text = [job.title || '', stripHtml(job.description), ...(job.tags || [])]
          .join(' ')
          .toLowerCase();
        return terms.some((term) => text.includes(term));
      });
    }
  }

  // Location filter
  if (effectiveLocation) {
    const locationLower = effectiveLocation.toLowerCase();
    allRawJobs = allRawJobs.filter(
      (job) =>
        isIndiaRelevant(job) ||
        (job.location && job.location.toLowerCase().includes(locationLower)) ||
        (job.remote && locationLower.includes('remote'))
    );
  }

  // Spam filter
  allRawJobs = allRawJobs.filter((job) => !isSpamOrStaffing(job));

  const filteredJobs = allRawJobs.slice(0, limit);

  const resolvedJobs = await Promise.all(
    filteredJobs.map(async (item) => {
      const normalized = await normalizeJob(item);
      if (normalized) {
        return normalized;
      }

      const applyUrl = item.applyUrl || item.url || '';
      const detection = await detectSupportedPlatform(applyUrl);
      const rawDesc = stripHtml(item.description);
      const description = rawDesc.length > 1000 ? `${rawDesc.substring(0, 1000)}...` : rawDesc;

      return {
        title: normalizeText(item.title || 'Untitled job'),
        company: normalizeText(item.company || 'Unknown'),
        location: normalizeText(item.location || effectiveLocation),
        description,
        requiredSkills: extractSkillsFromText(rawDesc),
        salary: item.salary || '',
        jobUrl: detection.url || applyUrl,
        applyUrl: detection.url || applyUrl,
        applyUrlResolved: detection.url || applyUrl,
        source: detection.platform === 'other' ? item.source : detection.platform,
        platform: detection.platform,
        externalJobId: String(item.externalJobId || generateJobHash(item)),
        remote: Boolean(item.remote),
        tags: item.tags || [],
        country: item.country || (process.env.ALLOW_GLOBAL_JOBS === 'true' ? '' : 'IN'),
        automationSupported: Boolean(detection.automationSupported),
        jobHash: generateJobHash(item),
        missingSkills: [],
        recommendationScore: 0,
      };
    })
  );

  return resolvedJobs.filter((job) => job && job.jobUrl && job.title && job.company);
};

module.exports = {
  fetchJobsFromExternalApi,
};
