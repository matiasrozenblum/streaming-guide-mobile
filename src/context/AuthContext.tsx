import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { userApi, authApi } from '../services/api';
import { tokenEvents } from '../services/tokenEvents';
import { DeviceService } from '../services/device.service';
import { trackEvent, identifyUser, resetAnalytics, setAnalyticsAdminMode } from '../lib/analytics';

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
const USER_PROFILE_KEY = 'user_profile';

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

  /**
   * Single source of truth for tearing down a session. EVERY logout path
   * (explicit logout, 401 interceptor exhausting the refresh token, a failed
   * manual refresh) must go through here so the device always stops receiving
   * push notifications. Never clear a session anywhere else.
   */
  const clearSession = useCallback(async () => {
    // Best-effort: stop this device from receiving push notifications.
    // The unsubscribe endpoint only needs the deviceId, so it works even
    // after tokens are gone.
    try {
      await DeviceService.unregisterFCM();
    } catch (e) {
      console.warn('[Auth] unregisterFCM during clearSession failed:', e);
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
    setSession(null);
    try {
      await setAnalyticsAdminMode(false);
      await resetAnalytics();
    } catch {
      // analytics errors must never block logout
    }
  }, []);

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
          // Restore session immediately from cached profile (no network wait)
          const cachedProfileJson = await SecureStore.getItemAsync(USER_PROFILE_KEY);
          if (cachedProfileJson) {
            const cachedUser: User = JSON.parse(cachedProfileJson);
            setSession({ user: cachedUser, accessToken, refreshToken });
            if (cachedUser.role === 'admin') {
              await setAnalyticsAdminMode(true);
            }
            setIsLoading(false);
          }

          // Refresh profile from network in background
          const user = await fetchUserProfile(accessToken);
          if (user) {
            // The 401 interceptor may have rotated tokens while fetching the
            // profile — re-read the latest values so session state never holds
            // a stale token (Causa #2).
            const [latestAccess, latestRefresh] = await Promise.all([
              SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
              SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
            ]);
            await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(user));
            setSession({
              user,
              accessToken: latestAccess ?? accessToken,
              refreshToken: latestRefresh ?? refreshToken,
            });
            if (user.role === 'admin') {
              await setAnalyticsAdminMode(true);
            }
          }
          // If fetchUserProfile failed we deliberately do NOT clear the session
          // here (Causa #1):
          //   - transient network error on cold start → keep the cached session,
          //     the tokens are still valid (7-day access token).
          //   - genuine auth failure (refresh token exhausted) → the 401
          //     interceptor already deleted the tokens and emitted 'logout',
          //     which runs clearSession(). No independent teardown needed.
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // When the 401 interceptor exhausts the refresh token, tear down the
    // session through clearSession so FCM is unregistered too (Causa #3).
    const handleForcedLogout = () => {
      void clearSession();
    };
    tokenEvents.on('logout', handleForcedLogout);
    return () => tokenEvents.off('logout', handleForcedLogout);
  }, [clearSession]);

  const login = async (accessToken: string, refreshToken: string) => {
    try {
      // Store tokens securely
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

      // Fetch user profile
      const user = await fetchUserProfile(accessToken);
      if (user) {
        await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(user));
        setSession({ user, accessToken, refreshToken });

        // Disable analytics for admin users to avoid polluting metrics
        if (user.role === 'admin') {
          await setAnalyticsAdminMode(true);
          return;
        }

        // Analytics
        await identifyUser(user.id.toString(), {
          email: user.email,
          name: user.name,
          gender: user.gender,
          birthDate: user.birthDate,
          role: user.role,
        });
        await trackEvent('login_success', { method: user.origin || 'traditional' });
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
      // Track the explicit user-initiated logout before analytics is reset
      await trackEvent('logout_success');
    } catch {
      // ignore analytics failures
    }
    await clearSession();
  };

  const refreshSession = async () => {
    // Always read the freshest refresh token from storage, never from session
    // state (which could be stale — Causa #2).
    const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!storedRefresh) return;

    try {
      const data = await authApi.refreshToken(storedRefresh);
      await login(data.access_token, data.refresh_token);
    } catch (error) {
      console.error('Error refreshing session:', error);
      await clearSession();
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
