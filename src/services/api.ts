import axios, { AxiosInstance } from 'axios';
import { getPlatform } from '../context/AuthContext';
import { DeviceService } from './device.service';
import * as Application from 'expo-application';

// Development (Android Emulator)
// const BASE_URL = 'http://10.0.2.2:3000';

// Development (iOS Simulator)
// const BASE_URL = 'http://localhost:3000';

// Staging (Railway)
const BASE_URL = 'https://streaming-guide-backend-staging.up.railway.app';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add device info to all requests
api.interceptors.request.use(async (config) => {
  const t = Date.now();
  const deviceId = await DeviceService.getDeviceId();
  const platform = await getPlatform();
  const appVersion = Application.nativeApplicationVersion || '1.0.0';

  config.headers['X-Device-Id'] = deviceId;
  config.headers['X-Platform'] = platform;
  config.headers['X-App-Version'] = appVersion;

  const interceptorTime = Date.now() - t;
  if (interceptorTime > 50) {
    console.log(`[Perf] Interceptor overhead for ${config.url}: ${interceptorTime}ms`);
  }

  return config;
});

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
    const platform = await getPlatform();
    const appVersion = Application.nativeApplicationVersion || '1.0.0';

    const response = await api.post('/auth/register', {
      ...data,
      deviceId,
      platform,
      appVersion,
    });
    return response.data;
  },

  // Login existing user
  login: async (email: string, password: string) => {
    const deviceId = await DeviceService.getDeviceId();
    const platform = await getPlatform();
    const appVersion = Application.nativeApplicationVersion || '1.0.0';

    const response = await api.post('/auth/login', {
      email,
      password,
      deviceId,
      platform,
      appVersion,
    });
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken,
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
    const response = await api.post(`/programs/${programId}/subscribe`, {
      notificationMethod: 'both',
    }, {
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
  updateSubscription: async (subscriptionId: string, notificationMethod: string, accessToken: string) => {
    const response = await api.put(`/subscriptions/${subscriptionId}`, {
      notificationMethod,
    }, {
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

export default api;
