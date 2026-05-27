const INDIA_LOCATION_KEYWORDS = [
  'india',
  'bangalore',
  'bengaluru',
  'mumbai',
  'delhi',
  'ncr',
  'gurgaon',
  'gurugram',
  'hyderabad',
  'pune',
  'chennai',
  'kolkata',
  'ahmedabad',
  'noida',
  'remote india',
  'indore',
  'jaipur',
  'kochi',
  'coimbatore',
];

const SPAM_STAFFING_PATTERNS = [
  'staffing agency',
  'recruitment firm',
  'body shopping',
  'bench resource',
  'immediate joiner only',
  'mass hiring',
  'bulk hiring',
];

const normalizeText = (job = {}) =>
  [job.title, job.company, job.location, job.description, job.country]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const isIndiaRelevant = (job = {}) => {
  if (process.env.ALLOW_GLOBAL_JOBS === 'true') {
    return true;
  }
  const country = String(job.country || '').toLowerCase();
  if (country === 'in' || country === 'india') {
    return true;
  }

  if (job.remote === true || String(job.remote).toLowerCase() === 'true') {
    return true;
  }

  const location = String(job.location || '').toLowerCase();
  if (location.includes('remote') || location.includes('anywhere')) {
    return true;
  }

  const text = normalizeText(job);
  return INDIA_LOCATION_KEYWORDS.some((keyword) => text.includes(keyword));
};

const isSpamOrStaffing = (job = {}) => {
  const text = normalizeText(job);
  return SPAM_STAFFING_PATTERNS.some((pattern) => text.includes(pattern));
};

module.exports = {
  INDIA_LOCATION_KEYWORDS,
  SPAM_STAFFING_PATTERNS,
  isIndiaRelevant,
  isSpamOrStaffing,
};
