const REQUIRED_ALL = ['MONGO_URI', 'JWT_SECRET', 'REDIS_URL'];

const REQUIRED_PRODUCTION = [
  'CORS_ORIGIN',
  'OPENAI_API_KEY',
];

const RECOMMENDED_PRODUCTION = [];

const validateEnvironment = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = REQUIRED_ALL.filter((key) => !process.env[key]);

  if (isProduction) {
    missing.push(...REQUIRED_PRODUCTION.filter((key) => !process.env[key]));
  }

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (isProduction && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  if (isProduction && process.env.CORS_ORIGIN === '*') {
    throw new Error('CORS_ORIGIN must be set to your frontend URL in production (not *)');
  }

  const warnings = [];
  if (isProduction) {
    RECOMMENDED_PRODUCTION.forEach((key) => {
      if (!process.env[key]) warnings.push(key);
    });
    if (!process.env.BULL_BOARD_USER || !process.env.BULL_BOARD_PASSWORD) {
      warnings.push('BULL_BOARD_USER/BULL_BOARD_PASSWORD (Bull Board will be disabled)');
    }
  }

  if (warnings.length) {
    console.warn(`[env] Recommended variables not set: ${warnings.join(', ')}`);
  }

  return {
    redisUrl: process.env.REDIS_URL,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction,
  };
};

module.exports = {
  validateEnvironment,
  REQUIRED_ALL,
  REQUIRED_PRODUCTION,
};
