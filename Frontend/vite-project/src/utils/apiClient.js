// Empty VITE_API_URL = same-origin /api proxy (production nginx)
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const buildUrl = (path, params) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = API_URL || window.location.origin;
  const url = new URL(normalizedPath, base.endsWith('/') ? base : `${base}/`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const createError = (status, data) => {
  const errorMessage = typeof data === 'string' ? data : data?.message;
  const error = new Error(errorMessage || 'Request failed');
  error.response = { status, data };
  return error;
};

const request = async (method, path, payload, config = {}) => {
  const token = localStorage.getItem('authToken');
  const isFormData = payload instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(config.headers || {}),
  };

  if (isFormData) {
    delete headers['Content-Type'];
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, config.params), {
    method,
    headers,
    body: method === 'GET' ? undefined : isFormData ? payload : JSON.stringify(payload || {}),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && !path.includes('/api/auth/login') && !path.includes('/api/auth/signup')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    throw createError(response.status, data);
  }

  return { data, status: response.status };
};

export default {
  get: (path, config) => request('GET', path, undefined, config),
  post: (path, payload, config) => request('POST', path, payload, config),
};
