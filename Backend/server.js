require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const automationRoutes = require('./routes/automation');
const aiRoutes = require('./routes/ai');
const recommendationsRoutes = require('./routes/recommendations');
const healthRoutes = require('./routes/health');
const errorMiddleware = require('./middleware/errorMiddleware');
const { initSocket } = require('./utils/socketService');
const { validateEnvironment } = require('./utils/environment');
const { scheduleStartupIngestion } = require('./jobs/services/startupIngestionService');
const { closeRedisConnection } = require('./workers/redisConnection');
const logger = require('./utils/logger');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === 'production';

try {
  validateEnvironment();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const corsOrigin = process.env.CORS_ORIGIN || (isProduction ? false : '*');
const corsOptions =
  corsOrigin === false
    ? { origin: false }
    : {
        origin: corsOrigin.split(',').map((o) => o.trim()),
        credentials: true,
      };

app.use(
  helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors(corsOptions));
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || (isProduction ? 200 : 300)),
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/automation-media', express.static(path.join(__dirname, 'automation/media')));

app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/health', healthRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ai-job-automation-api' });
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    initSocket(server, corsOrigin === false ? '*' : corsOrigin);

    scheduleStartupIngestion();

    server.listen(PORT, () => {
      logger.info('Server listening', { port: PORT, env: process.env.NODE_ENV });
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error', { error: error.message });
    process.exit(1);
  });

const shutdown = async (signal) => {
  logger.info('Shutdown signal received', { signal });
  server.close(async () => {
    await mongoose.connection.close();
    await closeRedisConnection();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
// Restart trigger comment to pick up new env vars

