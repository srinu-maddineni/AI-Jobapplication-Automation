const Job = require('../../models/Job');
const { runIngestionWithTimeout } = require('./startupIngestionService');
const logger = require('../../utils/logger');

const buildIndiaFilter = (location) => {
  const filter = {};
  if (location) {
    filter.$or = [
      { location: { $regex: location, $options: 'i' } },
      { country: { $regex: location, $options: 'i' } }
    ];
  } else {
    filter.$or = [
      { country: { $regex: /india|IN/i } },
      { location: { $regex: /india|bangalore|mumbai|hyderabad|pune|delhi|remote|anywhere/i } },
      { remote: true }
    ];
  }
  return filter;
};

const countJobs = (filter) => Job.countDocuments(filter);

/**
 * Ensure jobs exist before recommendations; triggers ingestion if empty.
 */
const ensureJobsAvailable = async ({ location, minCount = 1, timeoutMs } = {}) => {
  const filter = buildIndiaFilter(location);
  let count = await countJobs(filter);

  if (count >= minCount) {
    return { synced: false, count, filter };
  }

  logger.info('Jobs database empty — triggering ingestion', { count, location });

  const ingestionResult = await runIngestionWithTimeout(
    timeoutMs || Number(process.env.INGESTION_FETCH_TIMEOUT_MS || 90000)
  );

  count = await countJobs(filter);

  return {
    synced: true,
    count,
    filter,
    ingestion: ingestionResult,
  };
};

module.exports = {
  buildIndiaFilter,
  ensureJobsAvailable,
  countJobs,
};
