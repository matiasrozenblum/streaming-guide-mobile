import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getPlatform } from '../context/AuthContext';
import { DeviceService } from './device.service';
import * as Application from 'expo-application';
import { tokenEvents } from './tokenEvents';

import Constants from 'expo-constants';

// Get API URL from app.config.ts based on environment
const BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000'; // Fallback for safety

console.log('[API] Initializing with Base URL:', BASE_URL);

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add device info and JWT to all requests
api.interceptors.request.use(async (config) => {
  const t = Date.now();
  const deviceId = await DeviceService.getDeviceId();
  const platform = await getPlatform();
  const appVersion = Application.nativeApplicationVersion || '1.0.0';

  config.headers['X-Device-Id'] = deviceId;
  config.headers['X-Platform'] = platform;
  config.headers['X-App-Version'] = appVersion;

  // Inject JWT if available and not already set by the caller
  if (!config.headers['Authorization']) {
    const accessToken = await SecureStore.getItemAsync('access_token');
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  const interceptorTime = Date.now() - t;
  if (interceptorTime > 50) {
    console.log(`[Perf] Interceptor overhead for ${config.url}: ${interceptorTime}ms`);
  }

  return config;
});

// 401 response interceptor: silent token refresh with request queue
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token as string);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh logic for auth endpoints (login, register, refresh itself)
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await api.post('/auth/refresh', null, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        });
        const { access_token, refresh_token } = response.data;

        await SecureStore.setItemAsync('access_token', access_token);
        await SecureStore.setItemAsync('refresh_token', refresh_token);

        processQueue(null, access_token);

        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user_profile');
        tokenEvents.emit('logout');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Auth API endpoints
export const authApi = {
  // Send verification code to email
  sendCode: async (email: string) => {
    const response = await api.post('/auth/send-code', {
      identifier: email,
    });
    return response.data;
  },

  // Verify code and get tokens (for new users)
  verifyCode: async (email: string, code: string) => {
    const deviceId = await DeviceService.getDeviceId();
    const response = await api.post('/auth/verify-code', {
      identifier: email,
      code,
      deviceId,
    });
    return response.data;
  },

  // Register new user
  register: async (data: {
    registration_token: string;
    firstName: string;
    lastName: string;
    password: string;
    birthDate?: string;
    gender?: string;
  }) => {
    const deviceId = await DeviceService.getDeviceId();

    const response = await api.post('/auth/register', {
      ...data,
      deviceId,
    });
    return response.data;
  },

  // Login existing user
  login: async (email: string, password: string) => {
    const deviceId = await DeviceService.getDeviceId();

    const response = await api.post('/auth/login', {
      email,
      password,
      deviceId,
    });
    return response.data;
  },

  // Social Login
  socialLogin: async (data: { email: string; firstName?: string; lastName?: string; origin: string; gender?: string; birthDate?: string }) => {
    const response = await api.post('/auth/social-login', data);
    return response.data;
  },

  // Complete Profile
  completeProfile: async (data: {
    registration_token: string;
    firstName: string;
    lastName: string;
    gender: string;
    birthDate: string;
  }) => {
    const deviceId = await DeviceService.getDeviceId();

    const response = await api.post('/auth/complete-profile', {
      ...data,
      deviceId,
    });
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', null, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    return response.data;
  },

  // Check if email exists
  checkEmail: async (email: string) => {
    try {
      const response = await api.get(`/users/email/${email}`);
      return { exists: true, user: response.data };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { exists: false };
      }
      throw error;
    }
  },
};

// User API endpoints
export const userApi = {
  // Get current user
  getMe: async (accessToken: string) => {
    const response = await api.get('/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Update user
  updateUser: async (userId: number, data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    gender: string;
    birthDate: string;
  }>, accessToken: string) => {
    const response = await api.patch(`/users/${userId}`, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: number, accessToken: string) => {
    const response = await api.delete(`/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },
};

// Subscriptions API endpoints
export const subscriptionsApi = {
  // Get user subscriptions
  getSubscriptions: async (accessToken: string) => {
    const response = await api.get('/subscriptions', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Subscribe to program (POST /programs/:id/subscribe)
  subscribe: async (programId: number, accessToken: string) => {
    const response = await api.post(`/programs/${programId}/subscribe`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Unsubscribe from program (DELETE /programs/:id/subscribe)
  unsubscribe: async (programId: number, accessToken: string) => {
    const response = await api.delete(`/programs/${programId}/subscribe`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Get subscription status for a program
  getSubscriptionStatus: async (programId: number, accessToken: string) => {
    const response = await api.get(`/programs/${programId}/subscription-status`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Update subscription notification method (PUT /subscriptions/:id)
  updateSubscription: async (subscriptionId: string, accessToken: string) => {
    const response = await api.put(`/subscriptions/${subscriptionId}`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Delete subscription by ID (DELETE /subscriptions/:id)
  deleteSubscription: async (subscriptionId: string, accessToken: string) => {
    const response = await api.delete(`/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },
};

export const appApi = {
  getHoliday: async (): Promise<{ isHoliday: boolean }> => {
    const response = await api.get('/holiday');
    return response.data;
  }
};

export default api;
