import { useEffect, useRef } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Alert, Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { DeviceService } from '../services/device.service';
import * as Device from 'expo-device';
import { useAuth } from '../context/AuthContext';
import { navigate, navigationRef } from '../navigation/NavigationService';
import { videoPlayerRef } from '../context/VideoPlayerContext';

export function usePushNotifications() {
    const { session, isAuthenticated } = useAuth();
    const registeredRef = useRef(false);
    const fcmTokenRef = useRef<string | null>(null);

    // Effect 1: Setup Firebase messaging (runs once on mount, independent of auth)
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

            console.log('[Push] Requesting notification permission...');
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (!enabled) {
                console.log('[Push] Permission denied, authStatus:', authStatus);
                return;
            }
            console.log('[Push] Permission granted');

            if (Platform.OS === 'ios') {
                await messaging().registerDeviceForRemoteMessages();
            }

            try {
                const token = await messaging().getToken();
                console.log('[Push] FCM token obtained:', token?.substring(0, 20) + '...');
                fcmTokenRef.current = token;
            } catch (error: any) {
                console.error('[Push] Failed to get FCM token:', error);
                return;
            }

            // Listen for token refresh
            unsubscribeTokenRefresh = messaging().onTokenRefresh((newToken) => {
                console.log('[Push] FCM Token refreshed:', newToken?.substring(0, 20) + '...');
                fcmTokenRef.current = newToken;
                // Re-register if already authenticated
                registeredRef.current = false;
            });

            // Foreground message handler
            unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
                console.log('[Push] Foreground notification received:', remoteMessage.notification?.title);
                // We do NOT show an Alert.alert here because the user wants to avoid the "double" notification effect.
                // The system notification (if configured to show in foreground) or just the badge/sound is enough.
            });

            // Handle user tapping the notification when the app is running in the background
            messaging().onNotificationOpenedApp(remoteMessage => {
                console.log('[Push] Notification caused app to open from background:', remoteMessage);
                const url = remoteMessage?.data?.url;
                if (url && typeof url === 'string') {
                    const domain = url.toLowerCase();
                    let service: any = 'youtube';
                    if (domain.includes('twitch.tv')) service = 'twitch';
                    if (domain.includes('kick.com')) service = 'kick';

                    navigate('MainTabs', { screen: 'Streamers' });
                    // Provide a tiny delay for navigation state to settle
                    setTimeout(() => {
                        videoPlayerRef.current?.openVideo(url, service);
                    }, 300);
                }
            });

            // Handle user tapping the notification to fully launch the app from a quit state
            messaging().getInitialNotification().then(remoteMessage => {
                if (remoteMessage) {
                    console.log('[Push] Notification caused app to open from quit state:', remoteMessage);
                    const url = remoteMessage?.data?.url;
                    if (url && typeof url === 'string') {
                        const domain = url.toLowerCase();
                        let service: any = 'youtube';
                        if (domain.includes('twitch.tv')) service = 'twitch';
                        if (domain.includes('kick.com')) service = 'kick';

                        // Navigate to Streamers screen slightly delayed to let the app fully mount
                        setTimeout(() => {
                            navigate('MainTabs', { screen: 'Streamers' });
                            // Open the inner video player right after
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
            // TODO: Remove this alert after debugging push notifications
            Alert.alert('[DEBUG] Push Setup Error', String(error?.message || error));
        });

        return () => {
            unsubscribeTokenRefresh?.();
            unsubscribeOnMessage?.();
        };
    }, []); // Runs once on mount

    // Effect 2: Register with backend when authenticated AND we have a token
    useEffect(() => {
        if (!isAuthenticated || !session?.accessToken || registeredRef.current) {
            return;
        }

        const registerWithBackend = async () => {
            // Wait a moment for FCM token to be available if it hasn't loaded yet
            let attempts = 0;
            while (!fcmTokenRef.current && attempts < 10) {
                console.log('[Push] Waiting for FCM token... attempt', attempts + 1);
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }

            const fcmToken = fcmTokenRef.current;
            if (!fcmToken) {
                console.log('[Push] No FCM token available after waiting, skipping registration');
                return;
            }

            console.log('[Push] Registering device with backend...');
            try {
                const deviceResult = await DeviceService.registerDevice(session.accessToken);
                console.log('[Push] Device registered:', JSON.stringify(deviceResult));

                const fcmResult = await DeviceService.registerFCM(fcmToken);
                console.log('[Push] FCM registered:', fcmResult);

                registeredRef.current = true;
                console.log('[Push] Registration complete!');
            } catch (error: any) {
                console.error('[Push] Backend registration failed:', error?.message || error);
                // TODO: Remove this alert after debugging push notifications
                Alert.alert('[DEBUG] Registration Error', String(error?.message || error));
            }
        };

        registerWithBackend();
    }, [isAuthenticated, session?.accessToken]);

    // Effect 3: Reset on logout
    useEffect(() => {
        if (!isAuthenticated) {
            registeredRef.current = false;
        }
    }, [isAuthenticated]);
}
