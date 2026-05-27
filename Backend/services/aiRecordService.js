const AIAnalysis = require('../models/AIAnalysis');
const CoverLetter = require('../models/CoverLetter');

const saveAIAnalysis = async ({ userId, resumeScore, matchedSkills, missingSkills, aiSuggestions, tokenUsage, requestType }) => {
  const analysis = new AIAnalysis({
    userId,
    resumeScore,
    matchedSkills,
    missingSkills,
    aiSuggestions,
    tokenUsage,
    requestType,
  });
  return analysis.save();
};

const saveCoverLetter = async ({ userId, company, role, generatedContent, tokenUsage }) => {
  const coverLetter = new CoverLetter({
    userId,
    company,
    role,
    generatedContent,
    tokenUsage,
  });
  return coverLetter.save();
};

module.exports = {
  saveAIAnalysis,
  saveCoverLetter,
};
