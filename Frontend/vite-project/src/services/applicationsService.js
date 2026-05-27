import apiClient from '../utils/apiClient';
import { ENDPOINTS } from '../api/endpoints';

const getMyApplications = async () => {
  const response = await apiClient.get(ENDPOINTS.applications.mine);
  return response.data;
};

const applyToJob = async (payload) => {
  const response = await apiClient.post(ENDPOINTS.applications.apply, payload);
  return response.data;
};

const sendHREmail = async ({ jobId, toEmail, subject, body }) => {
  const response = await apiClient.post(ENDPOINTS.automation.sendHREmail, { jobId, toEmail, subject, body });
  return response.data;
};

const applicationsService = {
  getMyApplications,
  applyToJob,
  sendHREmail,
};

export default applicationsService;
