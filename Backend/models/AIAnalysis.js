const mongoose = require('mongoose');

const aiAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resumeScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    aiSuggestions: {
      type: [String],
      default: [],
    },
    tokenUsage: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
    },
    requestType: {
      type: String,
      enum: ['resume_analysis', 'job_analysis', 'match', 'resume_optimization', 'interview_questions'],
      default: 'resume_analysis',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AIAnalysis', aiAnalysisSchema);
