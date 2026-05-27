const rateLimit = require('express-rate-limit');

// Protect AI endpoints from repeated abuse. Adjust the window and limit for production as needed.
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 AI API calls per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many AI requests from this IP, please wait a few minutes and try again.',
  },
});

module.exports = aiRateLimiter;
