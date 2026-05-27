const buildResumeAnalysisPrompt = (resumeText) => `You are an AI resume intelligence engine. Analyze the following resume text and return valid JSON ONLY with keys: detectedSkills, experienceLevel, strengths, missingSkills, atsScore, recommendedImprovements. Use a professional tone and base your recommendations on current tech hiring expectations. Resume text:\n\n${resumeText}`;

const buildJobAnalysisPrompt = (jobDescription) => `You are an AI job description analyzer. Analyze the following job description and return valid JSON ONLY with keys: requiredSkills, preferredSkills, experienceRequirements, keywords, responsibilities. Do not include additional commentary. Job description:\n\n${jobDescription}`;

const buildMatchPrompt = (resumeText, jobDescription) => `You are a hiring match scoring engine. Compare the resume text with the job description and return valid JSON ONLY with keys: matchScore, missingSkills, recommendedResumeImprovements, probabilityOfSelection. Use a score between 0 and 100 for matchScore and estimate probabilityOfSelection as a percent string. Resume text:\n${resumeText}\n\nJob description:\n${jobDescription}`;

const buildCoverLetterPrompt = (profile, company, role, jobDescription) => `You are a professional cover letter writer. Craft a personalized, concise, and compelling cover letter for a candidate with the following profile and target role. Output only the letter content. Candidate profile: ${JSON.stringify(profile)}. Company: ${company}. Role: ${role}. Job description: ${jobDescription}. Include why the candidate is a strong fit, relevant achievements, and alignment with company priorities.`;

const buildResumeOptimizationPrompt = (resumeText, jobDescription) => `You are an AI resume optimizer. Review the resume and the job description, then return valid JSON ONLY with keys: atsKeywordSuggestions, resumeImprovementSuggestions, missingTechnologies, formattingRecommendations. Use concise, actionable advice that will improve ATS visibility and hiring manager clarity. Resume text:\n${resumeText}\n\nJob description:\n${jobDescription}`;

const buildInterviewQuestionPrompt = (profile, company, role, jobDescription) => `You are an interview preparation assistant. Generate valid JSON ONLY with keys: likelyInterviewQuestions, technicalQuestions, hrQuestions, projectBasedQuestions. Use the profile: ${JSON.stringify(profile)}; Company: ${company}; Role: ${role}; Job description: ${jobDescription}. Each key should be an array of 4-6 distinct question strings.`;

module.exports = {
  buildResumeAnalysisPrompt,
  buildJobAnalysisPrompt,
  buildMatchPrompt,
  buildCoverLetterPrompt,
  buildResumeOptimizationPrompt,
  buildInterviewQuestionPrompt,
};
