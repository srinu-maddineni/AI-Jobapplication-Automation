const express = require('express');
const mongoose = require('mongoose');
const { validateRedisConnection } = require('../workers/redisConnection');

const router = express.Router();

router.get('/', async (req, res) => {
  const redis = await validateRedisConnection().catch((error) => ({
    connected: false,
    supported: false,
    error: error.message,
  }));

  res.json({
    status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded',
    mongo: {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
    },
    redis,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
