import apiClient from '../utils/apiClient';
import { ENDPOINTS } from '../api/endpoints';

const analyzeResume = async (resumeText) => {
  const response = await apiClient.post(ENDPOINTS.ai.analyzeResume, { resumeText });
  return response.data;
};

const analyzeJob = async (jobDescription) => {
  const response = await apiClient.post(ENDPOINTS.ai.analyzeJob, { jobDescription });
  return response.data;
};

const matchResume = async (resumeText, jobDescription) => {
  const response = await apiClient.post(ENDPOINTS.ai.match, { resumeText, jobDescription });
  return response.data;
};

const generateCoverLetter = async (payload) => {
  const response = await apiClient.post(ENDPOINTS.ai.generateCoverLetter, payload);
  return response.data;
};

const optimizeResume = async (resumeText, jobDescription) => {
  const response = await apiClient.post(ENDPOINTS.ai.optimizeResume, { resumeText, jobDescription });
  return response.data;
};

const generateInterviewQuestions = async (payload) => {
  const response = await apiClient.post(ENDPOINTS.ai.interviewQuestions, payload);
  return response.data;
};

const chat = async (message, history = [], lastJobs = []) => {
  const response = await apiClient.post(ENDPOINTS.ai.chat, { message, history, lastJobs });
  return response.data;
};

const getCompanyDomain = async (company) => {
  const response = await apiClient.post(ENDPOINTS.ai.companyDomain, { company });
  return response.data;
};

const aiService = {
  analyzeResume,
  analyzeJob,
  matchResume,
  generateCoverLetter,
  optimizeResume,
  generateInterviewQuestions,
  chat,
  getCompanyDomain,
};

export default aiService;
