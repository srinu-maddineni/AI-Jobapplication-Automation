import apiClient from '../utils/apiClient';
import { ENDPOINTS } from '../api/endpoints';

const uploadResume = async (formData, onUploadProgress) => {
  const response = await apiClient.post(ENDPOINTS.resume.upload, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return response.data;
};

const getMyResume = async () => {
  const response = await apiClient.get(ENDPOINTS.resume.myResume);
  return response.data;
};

const resumeService = {
  uploadResume,
  getMyResume,
};

export default resumeService;
