const { callOpenAI, callOpenAIChat } = require('./openaiService');
const {
  buildResumeAnalysisPrompt,
  buildJobAnalysisPrompt,
  buildMatchPrompt,
  buildCoverLetterPrompt,
  buildResumeOptimizationPrompt,
  buildInterviewQuestionPrompt,
} = require('../prompts/promptTemplates');

const safeParseJSON = (text, fallback = {}) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    // Sometimes model returns text with backticks or extra lines; try stripping whitespace.
    const cleaned = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    try {
      return JSON.parse(cleaned);
    } catch (innerError) {
      return fallback;
    }
  }
};

const analyzeResume = async (resumeText, userId) => {
  const prompt = buildResumeAnalysisPrompt(resumeText);
  const { text, usage } = await callOpenAI(prompt, { type: 'resume_analysis', resumeText }, 1100);
  const output = safeParseJSON(text, {
    detectedSkills: [],
    experienceLevel: 'Unknown',
    strengths: [],
    missingSkills: [],
    atsScore: 0,
    recommendedImprovements: [],
  });

  return {
    ...output,
    atsScore: Number(output.atsScore) || 0,
    detectedSkills: Array.isArray(output.detectedSkills) ? output.detectedSkills : [],
    strengths: Array.isArray(output.strengths) ? output.strengths : [output.strengths].flat().filter(Boolean),
    missingSkills: Array.isArray(output.missingSkills) ? output.missingSkills : [],
    recommendedImprovements: Array.isArray(output.recommendedImprovements) ? output.recommendedImprovements : [output.recommendedImprovements].flat().filter(Boolean),
    tokenUsage: usage,
  };
};

const analyzeJob = async (jobDescription) => {
  const prompt = buildJobAnalysisPrompt(jobDescription);
  const { text, usage } = await callOpenAI(prompt, { type: 'job_analysis', jobDescription }, 900);
  const output = safeParseJSON(text, {
    requiredSkills: [],
    preferredSkills: [],
    experienceRequirements: '',
    keywords: [],
    responsibilities: [],
  });

  return {
    requiredSkills: Array.isArray(output.requiredSkills) ? output.requiredSkills : [],
    preferredSkills: Array.isArray(output.preferredSkills) ? output.preferredSkills : [],
    experienceRequirements: output.experienceRequirements || '',
    keywords: Array.isArray(output.keywords) ? output.keywords : [],
    responsibilities: Array.isArray(output.responsibilities) ? output.responsibilities : [],
    tokenUsage: usage,
  };
};

const matchResumeToJob = async (resumeText, jobDescription) => {
  const prompt = buildMatchPrompt(resumeText, jobDescription);
  const { text, usage } = await callOpenAI(prompt, { type: 'match', resumeText, jobDescription }, 950);
  const output = safeParseJSON(text, {
    matchScore: 0,
    missingSkills: [],
    recommendedResumeImprovements: [],
    probabilityOfSelection: '0%',
  });

  return {
    matchScore: Number(output.matchScore) || 0,
    missingSkills: Array.isArray(output.missingSkills) ? output.missingSkills : [],
    recommendedResumeImprovements: Array.isArray(output.recommendedResumeImprovements) ? output.recommendedResumeImprovements : [output.recommendedResumeImprovements].flat().filter(Boolean),
    probabilityOfSelection: output.probabilityOfSelection || '0%',
    tokenUsage: usage,
  };
};

const generateCoverLetter = async (profile, company, role, jobDescription) => {
  const prompt = buildCoverLetterPrompt(profile, company, role, jobDescription);
  const { text, usage } = await callOpenAI(prompt, { type: 'cover_letter', profile, company, role, jobDescription }, 1200);
  return {
    generatedContent: text,
    tokenUsage: usage,
  };
};

const optimizeResume = async (resumeText, jobDescription) => {
  const prompt = buildResumeOptimizationPrompt(resumeText, jobDescription);
  const { text, usage } = await callOpenAI(prompt, { type: 'resume_optimization', resumeText, jobDescription }, 1000);
  const output = safeParseJSON(text, {
    atsKeywordSuggestions: [],
    resumeImprovementSuggestions: [],
    missingTechnologies: [],
    formattingRecommendations: [],
  });

  return {
    atsKeywordSuggestions: Array.isArray(output.atsKeywordSuggestions) ? output.atsKeywordSuggestions : [output.atsKeywordSuggestions].flat().filter(Boolean),
    resumeImprovementSuggestions: Array.isArray(output.resumeImprovementSuggestions) ? output.resumeImprovementSuggestions : [output.resumeImprovementSuggestions].flat().filter(Boolean),
    missingTechnologies: Array.isArray(output.missingTechnologies) ? output.missingTechnologies : [output.missingTechnologies].flat().filter(Boolean),
    formattingRecommendations: Array.isArray(output.formattingRecommendations) ? output.formattingRecommendations : [output.formattingRecommendations].flat().filter(Boolean),
    tokenUsage: usage,
  };
};

const generateInterviewQuestions = async (profile, company, role, jobDescription) => {
  const prompt = buildInterviewQuestionPrompt(profile, company, role, jobDescription);
  const { text, usage } = await callOpenAI(prompt, { type: 'interview_questions', profile, company, role, jobDescription }, 1000);
  const output = safeParseJSON(text, {
    likelyInterviewQuestions: [],
    technicalQuestions: [],
    hrQuestions: [],
    projectBasedQuestions: [],
  });

  return {
    likelyInterviewQuestions: Array.isArray(output.likelyInterviewQuestions) ? output.likelyInterviewQuestions : [output.likelyInterviewQuestions].flat().filter(Boolean),
    technicalQuestions: Array.isArray(output.technicalQuestions) ? output.technicalQuestions : [output.technicalQuestions].flat().filter(Boolean),
    hrQuestions: Array.isArray(output.hrQuestions) ? output.hrQuestions : [output.hrQuestions].flat().filter(Boolean),
    projectBasedQuestions: Array.isArray(output.projectBasedQuestions) ? output.projectBasedQuestions : [output.projectBasedQuestions].flat().filter(Boolean),
    tokenUsage: usage,
  };
};

const chat = async (message, history = [], recentJobs = [], resumeText = '') => {
  const systemInstruction = `You are a helpful job application assistant. 
You can guide the user in optimizing their resume, searching for jobs, and managing their applications.

Here is the context about the user's latest jobs in the database:
${JSON.stringify(recentJobs.map(j => ({
  title: j.title,
  company: j.company,
  location: j.location,
  source: j.source,
  applyUrl: j.applyUrlResolved || j.jobUrl,
  createdAt: j.createdAt
})), null, 2)}

User resume context (if any):
${resumeText || 'No resume uploaded yet.'}

Format any job postings you recommend with clear titles, companies, locations, and clickable markdown links like: [Apply to JobTitle at Company](applyUrl).
Keep your answers brief, professional, and friendly.`;

  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  const { text } = await callOpenAIChat(messages, 800);
  return { text };
};

const findCompanyDomain = async (companyName) => {
  const prompt = `You are a helper that finds the official website domain of a company for recruiter contact purposes.
Given the company name: "${companyName}", respond with ONLY the official root domain name of this company (e.g., "renesas.com", "google.com", "conxai.com", "nagarro.com", "hireflex247.com"). 
Do not include "www.", "http://", "https://", punctuation, or any other text. Only respond with the domain name. If you are unsure, respond with the cleaned company name + ".com".`;

  const messages = [
    { role: 'user', content: prompt }
  ];
  try {
    const { text } = await callOpenAIChat(messages, 50);
    return { domain: text.trim().toLowerCase() };
  } catch (error) {
    return { domain: '' };
  }
};

module.exports = {
  analyzeResume,
  analyzeJob,
  matchResumeToJob,
  generateCoverLetter,
  optimizeResume,
  generateInterviewQuestions,
  chat,
  findCompanyDomain,
};
