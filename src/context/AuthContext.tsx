import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { userApi, authApi, performTokenRefresh } from '../services/api';
import { tokenStorage } from '../services/tokenStorage';
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
    // Clear the tokens first: the in-flight push registration started by
    // usePushNotifications reads auth state before calling the backend, so the
    // session must already be gone by the time the unsubscribe lands. Otherwise
    // that registration re-subscribes the device moments after we unsubscribe
    // it, and a logged-out device keeps receiving notifications.
    await tokenStorage.clear();
    await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
    setSession(null);

    // Best-effort: stop this device from receiving push notifications.
    // The unsubscribe endpoint only needs the deviceId, so it works even
    // after tokens are gone. If it fails, the flag stays set and the next
    // cold start retries it.
    try {
      await DeviceService.unregisterFCM();
    } catch (e) {
      console.warn('[Auth] unregisterFCM during clearSession failed:', e);
    }
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
        const tokens = await tokenStorage.get();

        if (!tokens) {
          // No session on disk. clearSession() only runs on a logged-in →
          // logged-out *transition*, so a device that lost its tokens between
          // launches would otherwise stay subscribed to push forever. Reconcile
          // it here: this also retries an unsubscribe that failed at logout.
          if (await DeviceService.isFCMRegistered()) {
            console.log('[Auth] No session but device is registered for push — unregistering');
            await DeviceService.unregisterFCM();
          }
          return;
        }

        const { accessToken, refreshToken } = tokens;

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
          const latest = await tokenStorage.get();
          await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(user));
          setSession({
            user,
            accessToken: latest?.accessToken ?? accessToken,
            refreshToken: latest?.refreshToken ?? refreshToken,
          });
          if (user.role === 'admin') {
            await setAnalyticsAdminMode(true);
          }
        }
        // If fetchUserProfile failed we deliberately do NOT clear the session
        // here (Causa #1):
        //   - transient network error on cold start → keep the cached session,
        //     the tokens are still valid (7-day access token).
        //   - genuine auth failure (refresh token rejected) → the 401
        //     interceptor emitted 'logout', which runs clearSession(). No
        //     independent teardown needed.
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
      // Store both tokens in a single atomic write — a half-persisted pair is
      // what silently killed sessions a week later.
      await tokenStorage.set(accessToken, refreshToken);

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

  const refreshSession = useCallback(async () => {
    try {
      // performTokenRefresh reads the freshest pair from storage (never from
      // stale React state) and persists the rotated pair atomically.
      const accessToken = await performTokenRefresh();
      const latest = await tokenStorage.get();
      setSession((current) =>
        current && latest
          ? { ...current, accessToken, refreshToken: latest.refreshToken }
          : current,
      );
    } catch (error) {
      // Teardown is owned by the 401 interceptor, which knows whether the
      // backend actually rejected the session or we simply could not reach it.
      // Clearing here on any error is what turned offline blips into logouts.
      console.warn('[Auth] refreshSession failed:', (error as Error)?.message ?? error);
    }
  }, []);

  // Renew the access token before it expires, while the app is in the
  // foreground and the network is known-good.
  //
  // Refreshes used to happen only reactively, on a 401 — which meant tokens
  // rotated at most once every 7 days, and the 14-day refresh window counted
  // from login rather than from last use. A user active every few days could
  // still be logged out on day 14. Renewing on foreground keeps an actively
  // used session alive indefinitely.
  const isRefreshingRef = useRef(false);
  useEffect(() => {
    const maybeRefresh = async (state: AppStateStatus) => {
      if (state !== 'active' || isRefreshingRef.current) return;

      let tokens;
      try {
        tokens = await tokenStorage.get();
      } catch {
        return; // storage hiccup — never act on it
      }
      if (!tokens || !tokenStorage.isAccessTokenStale(tokens)) return;

      isRefreshingRef.current = true;
      try {
        console.log('[Auth] Access token is stale, refreshing proactively');
        await refreshSession();
      } finally {
        isRefreshingRef.current = false;
      }
    };

    void maybeRefresh('active');
    const subscription = AppState.addEventListener('change', maybeRefresh);
    return () => subscription.remove();
  }, [refreshSession]);

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
