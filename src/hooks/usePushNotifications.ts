import { useEffect, useRef } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceService } from '../services/device.service';
import * as Device from 'expo-device';
import { useAuth } from '../context/AuthContext';
import { navigate } from '../navigation/NavigationService';
import { videoPlayerRef } from '../context/VideoPlayerContext';

const PUSH_PROMPT_SHOWN_KEY = '@push_permission_prompted';

// Module-level state shared between hook and exported function
let fcmToken: string | null = null;

/**
 * Request notification permission on demand (e.g. when user subscribes to a program).
 * Returns true if permission was granted, false otherwise.
 * Safe to call multiple times — if already granted, resolves immediately.
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS === 'web' || !Device.isDevice) return false;

    // Check current status first (no dialog)
    const { status: currentStatus } = await Notifications.getPermissionsAsync();
    const alreadyEnabled = currentStatus === 'granted';

    if (alreadyEnabled && fcmToken) {
        return true;
    }

    // Request permission (shows system dialog on Android 13+ and iOS)
    console.log('[Push] Requesting notification permission...');
    const { status } = await Notifications.requestPermissionsAsync();
    const enabled = status === 'granted';

    if (!enabled) {
        console.log('[Push] Permission denied by user');
        return false;
    }

    console.log('[Push] Permission granted by user');

    if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
    }

    // Get FCM token if we don't have one yet
    if (!fcmToken) {
        try {
            fcmToken = await messaging().getToken();
            console.log('[Push] FCM token obtained:', fcmToken?.substring(0, 20) + '...');
        } catch (error: any) {
            console.error('[Push] Failed to get FCM token:', error);
        }
    }

    return true;
}

/** Get the current FCM token (may be null if permission not yet granted) */
export function getFcmToken(): string | null {
    return fcmToken;
}

export function usePushNotifications() {
    const { session, isAuthenticated } = useAuth();
    const registeredRef = useRef(false);
    // Keep a ref to session so callbacks set up with [] deps can access the current value
    const sessionRef = useRef(session);
    useEffect(() => { sessionRef.current = session; }, [session]);

    // Effect 1: Setup Firebase messaging (channel, handlers, silent permission check — NO dialog)
    useEffect(() => {
        if (Platform.OS === 'web' || !Device.isDevice) return;

        let unsubscribeTokenRefresh: (() => void) | undefined;
        let unsubscribeOnMessage: (() => void) | undefined;

        const setupFirebase = async () => {
            // Create Android notification channel (required for Android 8+)
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('streaming_alerts', {
                    name: 'Alertas de Streaming',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                });
                console.log('[Push] Android notification channel created');
            }

            // Check if permission was already granted
            const { status: currentStatus } = await Notifications.getPermissionsAsync();
            let enabled = currentStatus === 'granted';

            // If not yet granted, check if this is the first app launch — prompt once
            if (!enabled) {
                const alreadyPrompted = await AsyncStorage.getItem(PUSH_PROMPT_SHOWN_KEY);
                if (!alreadyPrompted) {
                    console.log('[Push] First launch — requesting notification permission...');
                    // Use expo-notifications which is more reliable on Android 13+ with Expo
                    const { status } = await Notifications.requestPermissionsAsync();
                    enabled = status === 'granted';
                    // Only mark as prompted after the dialog was actually shown
                    await AsyncStorage.setItem(PUSH_PROMPT_SHOWN_KEY, 'true');
                    console.log('[Push] Permission result:', status);
                } else {
                    console.log('[Push] Permission not granted (will request when user subscribes)');
                }
            }

            if (enabled) {
                console.log('[Push] Permission granted');

                if (Platform.OS === 'ios') {
                    await messaging().registerDeviceForRemoteMessages();
                }

                try {
                    fcmToken = await messaging().getToken();
                    console.log('[Push] FCM token obtained:', fcmToken?.substring(0, 20) + '...');
                } catch (error: any) {
                    console.error('[Push] Failed to get FCM token:', error);
                }
            }

            // Listen for token refresh — re-register immediately so the backend
            // never holds a stale token (Effect 2 won't re-run if auth state didn't change)
            unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
                console.log('[Push] FCM Token refreshed:', newToken?.substring(0, 20) + '...');
                fcmToken = newToken;
                registeredRef.current = false;
                if (sessionRef.current?.accessToken) {
                    try {
                        await DeviceService.registerFCM(newToken);
                        registeredRef.current = true;
                        console.log('[Push] Re-registered new FCM token with backend');
                    } catch (error: any) {
                        console.error('[Push] Failed to re-register new FCM token:', error?.message || error);
                    }
                }
            });

            // Foreground message handler
            unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
                console.log('[Push] Foreground notification received:', remoteMessage.notification?.title);
            });

            // Handle notification tap from background
            messaging().onNotificationOpenedApp(remoteMessage => {
                console.log('[Push] Notification caused app to open from background:', remoteMessage);
                const url = remoteMessage?.data?.url;
                if (url && typeof url === 'string') {
                    const domain = url.toLowerCase();
                    let service: any = 'youtube';
                    if (domain.includes('twitch.tv')) service = 'twitch';
                    if (domain.includes('kick.com')) service = 'kick';

                    navigate('MainTabs', { screen: 'Streamers' });
                    setTimeout(() => {
                        videoPlayerRef.current?.openVideo(url, service);
                    }, 300);
                }
            });

            // Handle notification tap from quit state
            messaging().getInitialNotification().then(remoteMessage => {
                if (remoteMessage) {
                    console.log('[Push] Notification caused app to open from quit state:', remoteMessage);
                    const url = remoteMessage?.data?.url;
                    if (url && typeof url === 'string') {
                        const domain = url.toLowerCase();
                        let service: any = 'youtube';
                        if (domain.includes('twitch.tv')) service = 'twitch';
                        if (domain.includes('kick.com')) service = 'kick';

                        setTimeout(() => {
                            navigate('MainTabs', { screen: 'Streamers' });
                            setTimeout(() => {
                                videoPlayerRef.current?.openVideo(url, service);
                            }, 500);
                        }, 500);
                    }
                }
            });
        };

        setupFirebase().catch((error) => {
            console.error('[Push] Firebase setup failed:', error?.message || error);
        });

        return () => {
            unsubscribeTokenRefresh?.();
            unsubscribeOnMessage?.();
        };
    }, []);

    // Effect 2: Register with backend when authenticated AND we have a token
    useEffect(() => {
        if (!isAuthenticated || !session?.accessToken || registeredRef.current) {
            return;
        }

        let cancelled = false;

        const registerWithBackend = async () => {
            // Wait a moment for FCM token to be available
            let attempts = 0;
            while (!fcmToken && attempts < 10 && !cancelled) {
                console.log('[Push] Waiting for FCM token... attempt', attempts + 1);
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }

            if (!fcmToken) {
                console.log('[Push] No FCM token available after waiting, skipping registration');
                return;
            }

            // The wait above can outlive the session: a cold start restores the
            // cached session, the profile fetch then 401s and the refresh fails,
            // and the teardown runs while we are still waiting for FCM. Without
            // this re-check the registration below lands *after* the logout and
            // silently re-subscribes the device — /push/fcm/subscribe needs no
            // auth, so it succeeds even with no session at all.
            if (cancelled || !sessionRef.current?.accessToken) {
                console.log('[Push] Session ended while waiting for FCM token, skipping registration');
                return;
            }

            console.log('[Push] Registering device with backend...');
            try {
                const deviceResult = await DeviceService.registerDevice(sessionRef.current.accessToken);
                console.log('[Push] Device registered:', JSON.stringify(deviceResult));

                // registerDevice swallows its errors and returns null, so a 401
                // here is the signal that the session died mid-flight. Carrying
                // on would subscribe a device whose user is no longer logged in.
                if (!deviceResult) {
                    console.log('[Push] Device registration failed, not subscribing to push');
                    return;
                }

                if (cancelled || !sessionRef.current?.accessToken) {
                    console.log('[Push] Session ended before FCM registration, skipping');
                    return;
                }

                const fcmResult = await DeviceService.registerFCM(fcmToken);
                console.log('[Push] FCM registered:', fcmResult);

                registeredRef.current = true;
                console.log('[Push] Registration complete!');
            } catch (error: any) {
                console.error('[Push] Backend registration failed:', error?.message || error);
            }
        };

        registerWithBackend();

        return () => { cancelled = true; };
    }, [isAuthenticated, session?.accessToken]);

    // Effect 3: Reset on logout
    useEffect(() => {
        if (!isAuthenticated) {
            registeredRef.current = false;
        }
    }, [isAuthenticated]);
}
