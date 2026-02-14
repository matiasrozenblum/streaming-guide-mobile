import { useEffect, useRef } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { DeviceService } from '../services/device.service';
import * as Device from 'expo-device';
import { useAuth } from '../context/AuthContext';

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
                console.log('[Push] Foreground notification:', remoteMessage.notification?.title);
                if (remoteMessage.notification) {
                    Alert.alert(
                        remoteMessage.notification.title || 'Notificación',
                        remoteMessage.notification.body || '',
                    );
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
