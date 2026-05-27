const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      trim: true,
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'pending', 'applied', 'interview', 'offer', 'rejected'],
      default: 'PENDING',
    },
    matchPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Automation tracking
    automationStartedAt: {
      type: Date,
    },
    automationCompletedAt: {
      type: Date,
    },
    appliedSuccessfully: {
      type: Boolean,
      default: false,
    },
    applied: {
      type: Boolean,
      default: false,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    finalSubmitted: {
      type: Boolean,
      default: false,
    },
    dryRun: {
      type: Boolean,
      default: false,
    },
    // Queue tracking
    queueJobId: {
      type: String,
    },
    // Error handling
    errorMessage: {
      type: String,
    },
    // Media
    screenshots: {
      beforeSubmit: String,
      afterSuccess: String,
      onFailure: String,
    },
    logs: [{
      timestamp: { type: Date, default: Date.now },
      level: { type: String, enum: ['info', 'warning', 'error'], default: 'info' },
      message: String,
      metadata: mongoose.Schema.Types.Mixed,
    }],
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ status: 1, userId: 1 });
applicationSchema.index({ queueJobId: 1 });

module.exports = mongoose.model('Application', applicationSchema);
