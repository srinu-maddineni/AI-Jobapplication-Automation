const { getRedisConnection } = require('../../workers/redisConnection');
const { runJobIngestion } = require('./jobIngestionRunner');
const { getIngestionStatus } = require('./ingestionMetrics');
const logger = require('../../utils/logger');

const LOCK_KEY = 'ingestion:startup:lock';
const LOCK_TTL_SECONDS = Number(process.env.INGESTION_LOCK_TTL_SECONDS || 120);
const STARTUP_DELAY_MS = Number(process.env.STARTUP_INGESTION_DELAY_MS || 3000);

let startupPromise = null;

const acquireLock = async () => {
  const redis = getRedisConnection();
  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect();
  }
  const result = await redis.set(LOCK_KEY, String(process.pid), 'EX', LOCK_TTL_SECONDS, 'NX');
  return result === 'OK';
};

const releaseLock = async () => {
  try {
    const redis = getRedisConnection();
    await redis.del(LOCK_KEY);
  } catch (error) {
    logger.warn('Failed to release ingestion lock', { error: error.message });
  }
};

const runWithLock = async (trigger, keywords, location) => {
  const acquired = await acquireLock();
  if (!acquired) {
    logger.info('Ingestion skipped — lock held by another process', { trigger });
    return { skipped: true, reason: 'lock_held' };
  }

  try {
    return await runJobIngestion({ trigger, keywords, location });
  } finally {
    await releaseLock();
  }
};

/**
 * Fire-and-forget ingestion on API startup (background-safe).
 */
const scheduleStartupIngestion = () => {
  if (process.env.DISABLE_STARTUP_INGESTION === 'true') {
    logger.info('Startup ingestion disabled via DISABLE_STARTUP_INGESTION');
    return;
  }

  if (startupPromise) {
    return startupPromise;
  }

  startupPromise = new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const result = await runWithLock('startup');
        resolve(result);
      } catch (error) {
        logger.error('Startup ingestion failed', { error: error.message });
        resolve({ error: error.message });
      }
    }, STARTUP_DELAY_MS);
  });

  return startupPromise;
};

/**
 * Await ingestion with timeout (for recommendations auto-fetch).
 */
const runIngestionWithTimeout = async (timeoutMs = 90000) => {
  const ingestionTask = runWithLock('api_auto_fetch');

  const timeoutTask = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Ingestion timed out')), timeoutMs);
  });

  try {
    return await Promise.race([ingestionTask, timeoutTask]);
  } catch (error) {
    logger.warn('Ingestion wait ended', { error: error.message });
    return { timedOut: true, error: error.message, status: getIngestionStatus() };
  }
};

module.exports = {
  scheduleStartupIngestion,
  runIngestionWithTimeout,
  runWithLock,
  getIngestionStatus,
};
