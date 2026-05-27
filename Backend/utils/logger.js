/**
 * Structured JSON logging for production observability.
 */
const log = (level, message, context = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
};

module.exports = {
  info: (message, context) => log('info', message, context),
  warn: (message, context) => log('warn', message, context),
  error: (message, context) => log('error', message, context),
  debug: (message, context) => {
    if (process.env.NODE_ENV !== 'production') {
      log('debug', message, context);
    }
  },
};
