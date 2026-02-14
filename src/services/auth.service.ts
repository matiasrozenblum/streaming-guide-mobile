import * as SecureStore from 'expo-secure-store';
import api from './api';

const TOKEN_KEY = 'auth_token';

export const AuthService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, response.data.accessToken);
    }
    return response.data;
  },

  async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async getToken() {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  }
};
