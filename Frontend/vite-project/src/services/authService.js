import apiClient from '../utils/apiClient';

const signup = async (payload) => {
  const response = await apiClient.post('/api/auth/signup', payload);
  return response.data;
};

const login = async (payload) => {
  const response = await apiClient.post('/api/auth/login', payload);
  return response.data;
};

const getCredentials = async () => {
  const response = await apiClient.get('/api/auth/credentials');
  return response.data;
};

const saveCredentials = async (credentials) => {
  const response = await apiClient.post('/api/auth/credentials', { credentials });
  return response.data;
};

const authService = {
  signup,
  login,
  getCredentials,
  saveCredentials,
};

export default authService;
