/**
 * Simple skill-based job scoring — no external dependencies.
 * Returns the same interface as before so jobsController works unchanged.
 */
const scoreJobWithAI = (user, resume, job, preferences = {}) => {
  const resumeSkills = (resume?.extractedSkills || []).map(s => s.toLowerCase());
  const jobSkills    = (job?.requiredSkills || []).map(s => s.toLowerCase());

  let matched = 0;
  const missingSkills = [];

  for (const skill of jobSkills) {
    if (resumeSkills.some(r => r.includes(skill) || skill.includes(r))) {
      matched++;
    } else {
      missingSkills.push(skill);
    }
  }

  const matchScore = jobSkills.length > 0
    ? Math.round((matched / jobSkills.length) * 100)
    : 60; // neutral default when no required skills listed

  const reasons = [];
  if (matched > 0) reasons.push(`Matches ${matched} of your skills`);
  if (missingSkills.length > 0) reasons.push(`Missing: ${missingSkills.slice(0, 3).join(', ')}`);
  const recommendationReason = reasons.join('. ') || 'Matches your profile.';

  return {
    matchScore,
    recommendationReason,
    missingSkills,
    confidenceScore: matchScore,
    autoApplyEligible: false,
    atsCompatibilityScore: matchScore,
    applySuccessProbability: matchScore,
  };
};

module.exports = { scoreJobWithAI };
