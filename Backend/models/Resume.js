const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resumeUrl: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    extractedText: {
      type: String,
      default: '',
    },
    extractedSkills: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

module.exports = mongoose.model('Resume', resumeSchema);
