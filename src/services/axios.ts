import axios from 'axios';
import { authStorage } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Bearer Token
axiosInstance.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh queue management
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: 401 Refresh & Standardized Error Handling
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = authStorage.getRefreshToken();

      if (!refreshToken) {
        authStorage.clearAll();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      return new Promise((resolve, reject) => {
        axios
          .post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
          .then(({ data }) => {
            const newAccess = data.data.access_token;
            const newRefresh = data.data.refresh_token;
            authStorage.setTokens(newAccess, newRefresh);
            axiosInstance.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            processQueue(null, newAccess);
            resolve(axiosInstance(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            authStorage.clearAll();
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    // Extract detail or errors from standard FastAPI error response
    if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === 'string') {
        error.message = error.response.data.detail;
      } else if (Array.isArray(error.response.data.detail)) {
        // FastAPI / Pydantic validation error array: [{ loc, msg, type }, ...]
        const msgs = error.response.data.detail
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item && typeof item.msg === 'string') {
              const field = Array.isArray(item.loc) && item.loc.length > 0 ? item.loc[item.loc.length - 1] : null;
              return field && field !== 'body' ? `${field}: ${item.msg}` : item.msg;
            }
            return JSON.stringify(item);
          })
          .filter(Boolean);
        error.message = msgs.join('; ') || 'Validation error occurred.';
      } else {
        error.message = JSON.stringify(error.response.data.detail);
      }
    } else if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
