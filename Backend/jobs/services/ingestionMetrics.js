const logger = require('../../utils/logger');

let lastRun = null;

const createEmptyMetrics = () => ({
  startedAt: new Date().toISOString(),
  completedAt: null,
  fetched: 0,
  inserted: 0,
  filtered: 0,
  duplicates: 0,
  atsSupported: 0,
  providers: {},
  errors: [],
});

let currentMetrics = createEmptyMetrics();

const recordProvider = (name, stats) => {
  currentMetrics.providers[name] = stats;
  currentMetrics.fetched += stats.fetched || 0;
  currentMetrics.inserted += stats.inserted || 0;
  currentMetrics.filtered += stats.filtered || 0;
  currentMetrics.atsSupported += stats.atsSupported || 0;
};

const finalizeMetrics = () => {
  currentMetrics.completedAt = new Date().toISOString();
  lastRun = { ...currentMetrics };
  logger.info('Job ingestion metrics', lastRun);
  return lastRun;
};

const resetMetrics = () => {
  currentMetrics = createEmptyMetrics();
  return currentMetrics;
};

const getLastMetrics = () => lastRun;

const getIngestionStatus = () => ({
  lastRun,
  inProgress: Boolean(currentMetrics.startedAt && !currentMetrics.completedAt),
});

module.exports = {
  createEmptyMetrics,
  recordProvider,
  finalizeMetrics,
  resetMetrics,
  getLastMetrics,
  getIngestionStatus,
};
