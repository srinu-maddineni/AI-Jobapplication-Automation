const cache = new Map();

const getCache = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCache = (key, value, ttlSeconds = 900) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const createCacheKey = (prefix, payload) => `${prefix}:${JSON.stringify(payload)}`;

module.exports = {
  getCache,
  setCache,
  createCacheKey,
};
