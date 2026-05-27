const crypto = require('crypto');

const normalizePart = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Deterministic hash for cross-source job deduplication.
 */
const generateJobHash = ({ title, company, location }) => {
  const key = [normalizePart(title), normalizePart(company), normalizePart(location)].join('|');
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
};

module.exports = {
  generateJobHash,
  normalizePart,
};
