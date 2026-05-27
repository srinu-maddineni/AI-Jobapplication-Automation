const linkedinScraper = require('../providers/linkedinScraperProvider');
const naukriScraper = require('../providers/naukriScraperProvider');
const indeedScraper = require('../providers/indeedScraperProvider');
const unstopScraper = require('../providers/unstopScraperProvider');
const internshalaScraper = require('../providers/internshalaScraperProvider');
// Use the SYNC normalizer for batch ingestion — avoids making 1 HTTP request per job
// (the async version calls detectSupportedPlatform which follows redirects per-job,
//  making startup/sync take many minutes and holding the Redis lock indefinitely).
const { normalizeJobSync } = require('./jobNormalizationService');
const Job = require('../../models/Job');
const logger = require('../../utils/logger');
const {
  resetMetrics,
  recordProvider,
  finalizeMetrics,
} = require('./ingestionMetrics');

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

const upsertJob = async (normalized) => {
  if (isMockJob(normalized)) {
    logger.info(`Skipping upsert of mock/test job in ingestion runner: ${normalized.title} @ ${normalized.company}`);
    return { isDuplicate: false, skipped: true };
  }
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const payload = {
    title: normalized.title,
    company: normalized.company,
    location: normalized.location,
    description: normalized.description,
    requiredSkills: normalized.requiredSkills,
    salary: normalized.salary,
    jobUrl: normalized.applyUrlResolved || normalized.applyUrl || normalized.jobUrl,
    applyUrl: normalized.applyUrl,
    applyUrlResolved: normalized.applyUrlResolved || normalized.applyUrl,
    remote: normalized.remote,
    tags: normalized.tags,
    platform: normalized.platform,
    postedAt: normalized.postedAt,
    metadata: normalized.metadata,
    country: normalized.country,
    automationSupported: normalized.automationSupported,
    jobHash: normalized.jobHash,
    missingSkills: normalized.missingSkills || [],
    recommendationScore: normalized.recommendationScore || 0,
    expiresAt,
    source: normalized.source,
    externalJobId: normalized.externalJobId,
  };

  const filter = {
    $or: [
      { jobHash: normalized.jobHash },
      { source: normalized.source, externalJobId: normalized.externalJobId }
    ]
  };

  const existing = await Job.findOne(filter).select('_id');

  await Job.findOneAndUpdate(filter, { $set: payload }, { upsert: true, new: true, setDefaultsOnInsert: true });

  return { isDuplicate: Boolean(existing) };
};

/**
 * Run India-focused job ingestion pipeline with dynamic keywords and location.
 */
const runJobIngestion = async ({ trigger = 'manual', keywords, location } = {}) => {
  resetMetrics();
  logger.info('Job ingestion started', { trigger, keywords, location });

  const searchKeywords = keywords || 'software engineer';
  const searchLocation = location || 'India';

  const providers = [
    { name: 'LinkedIn', fetch: () => linkedinScraper.fetchJobs(searchKeywords, searchLocation) },
    { name: 'Naukri', fetch: () => naukriScraper.fetchJobs(searchKeywords, searchLocation) },
    { name: 'Indeed', fetch: () => indeedScraper.fetchJobs(searchKeywords, searchLocation) },
    { name: 'Unstop', fetch: () => unstopScraper.fetchJobs(searchKeywords, searchLocation) },
    { name: 'Internshala', fetch: () => internshalaScraper.fetchJobs(searchKeywords, searchLocation) },
  ];

  let totalIngested = 0;
  let totalFiltered = 0;
  let totalDuplicates = 0;
  let totalAts = 0;

  for (const provider of providers) {
    const providerStats = { fetched: 0, inserted: 0, filtered: 0, atsSupported: 0, errors: [] };

    try {
      const rawJobs = await provider.fetch();
      providerStats.fetched = rawJobs.length;

      for (const rawJob of rawJobs) {
        try {
          const normalized = normalizeJobSync(rawJob);
          if (!normalized) {
            totalFiltered += 1;
            providerStats.filtered += 1;
            continue;
          }

          const { isDuplicate, skipped } = await upsertJob(normalized);
          if (skipped) {
            totalFiltered += 1;
            providerStats.filtered += 1;
            continue;
          }
          if (isDuplicate) {
            totalDuplicates += 1;
          } else {
            totalIngested += 1;
            providerStats.inserted += 1;
          }

          if (normalized.automationSupported) {
            totalAts += 1;
            providerStats.atsSupported += 1;
          }
        } catch (innerError) {
          providerStats.errors.push(innerError.message);
          logger.warn('Job save failed', {
            provider: provider.name,
            externalJobId: rawJob.externalJobId,
            error: innerError.message,
          });
        }
      }
    } catch (error) {
      providerStats.errors.push(error.message);
      logger.error('Provider ingestion failed', { provider: provider.name, error: error.message });
    }

    recordProvider(provider.name, providerStats);
  }

  const metrics = finalizeMetrics();
  const summary = {
    totalIngested,
    totalFiltered,
    totalDuplicates,
    totalAts,
    metrics,
  };

  logger.info('Job ingestion completed', summary);
  return summary;
};

module.exports = {
  runJobIngestion,
  upsertJob,
};
