const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    salary: {
      type: String,
      trim: true,
      default: '',
    },
    jobUrl: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    externalJobId: {
      type: String,
      required: true,
      trim: true,
    },
    applyUrl: {
      type: String,
      trim: true,
      default: '',
    },
    remote: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    platform: {
      type: String,
      trim: true,
      default: 'other',
    },
    postedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
    },
    country: {
      type: String,
      trim: true,
      default: '',
    },
    applyUrlResolved: {
      type: String,
      trim: true,
      default: '',
    },
    automationSupported: {
      type: Boolean,
      default: false,
    },
    jobHash: {
      type: String,
      trim: true,
      default: '',
    },
    recommendationScore: {
      type: Number,
      default: 0,
    },
    missingSkills: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Composite unique index (legacy provider dedup)
jobSchema.index({ source: 1, externalJobId: 1 }, { unique: true });

// Cross-source deduplication by normalized title/company/location
jobSchema.index({ jobHash: 1 }, { unique: true, sparse: true });

// TTL index for automatic deletion of expired/stale jobs
jobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Query performance for recommendations and ingestion
jobSchema.index({ createdAt: -1 });
jobSchema.index({ platform: 1, automationSupported: 1 });
jobSchema.index({ country: 1, createdAt: -1 });
jobSchema.index({ automationSupported: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
