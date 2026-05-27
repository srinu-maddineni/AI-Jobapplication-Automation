const mongoose = require('mongoose');

const coverLetterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    company: {
      type: String,
      trim: true,
      required: true,
    },
    role: {
      type: String,
      trim: true,
      required: true,
    },
    generatedContent: {
      type: String,
      required: true,
    },
    tokenUsage: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CoverLetter', coverLetterSchema);
