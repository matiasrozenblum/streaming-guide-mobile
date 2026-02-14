import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { userApi, authApi } from '../services/api';

export interface User {
  id: number;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  gender?: string;
  birthDate?: string;
  origin?: string;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Generate or retrieve device ID
async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync('device_id');
  if (!deviceId) {
    // Use a combination of device info to create a stable ID
    const androidId = Application.getAndroidId?.() || '';
    const deviceName = Device.deviceName || '';
    deviceId = `${Device.osName}-${androidId || deviceName}-${Date.now()}`;
    await SecureStore.setItemAsync('device_id', deviceId);
  }
  return deviceId;
}

async function getPlatform(): Promise<'ios' | 'android' | 'web'> {
  if (Device.osName === 'iOS') return 'ios';
  if (Device.osName === 'Android') return 'android';
  return 'web';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile with tokens
  const fetchUserProfile = async (accessToken: string): Promise<User | null> => {
    try {
      const data = await userApi.getMe(accessToken);
      return {
        id: data.id,
        email: data.email,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        gender: data.gender,
        birthDate: data.birthDate,
        origin: data.origin,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Load session from secure storage on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

        if (accessToken && refreshToken) {
          const user = await fetchUserProfile(accessToken);
          if (user) {
            setSession({ user, accessToken, refreshToken });
          } else {
            // Invalid token, clear storage
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = async (accessToken: string, refreshToken: string) => {
    try {
      // Store tokens securely
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

      // Fetch user profile
      const user = await fetchUserProfile(accessToken);
      if (user) {
        setSession({ user, accessToken, refreshToken });
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear tokens from secure storage
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      setSession(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const refreshSession = async () => {
    if (!session?.refreshToken) return;

    try {
      const data = await authApi.refreshToken(session.refreshToken);
      await login(data.access_token, data.refresh_token);
    } catch (error) {
      console.error('Error refreshing session:', error);
      await logout();
    }
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (session) {
      setSession({
        ...session,
        user: { ...session.user, ...updatedUser },
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isAuthenticated: !!session,
        login,
        logout,
        refreshSession,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export device helper for use in other components
export { getDeviceId, getPlatform };
