const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    recommendationScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      index: true,
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    aiInsights: {
      type: Object,
      default: {},
    },
    autoApplyEligible: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: true,
    },
  }
);

recommendationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
recommendationSchema.index({ userId: 1, recommendationScore: -1, createdAt: -1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);
