import apiClient from '../utils/apiClient';
import { ENDPOINTS } from '../api/endpoints';

const getJobs = async (params) => {
  const response = await apiClient.get(ENDPOINTS.jobs.list, { params });
  return response.data;
};

const getJobById = async (id) => {
  const response = await apiClient.get(ENDPOINTS.jobs.details(id));
  return response.data;
};

const fetchJobs = async (payload) => {
  const response = await apiClient.post(ENDPOINTS.jobs.fetch, payload);
  return response.data;
};

const getMatchedJobs = async (params) => {
  const response = await apiClient.get(ENDPOINTS.jobs.matched, { params });
  return response.data;
};

const getRecommendations = async (params) => {
  const response = await apiClient.get(ENDPOINTS.jobs.recommendations, { params });
  return response.data;
};

const syncJobs = async (payload) => {
  const response = await apiClient.post(ENDPOINTS.jobs.sync, payload || {});
  return response.data;
};

const getSyncStatus = async () => {
  const response = await apiClient.get(ENDPOINTS.jobs.syncStatus);
  return response.data;
};

const jobsService = {
  getJobs,
  getJobById,
  fetchJobs,
  getMatchedJobs,
  getRecommendations,
  syncJobs,
  getSyncStatus,
};

export default jobsService;
