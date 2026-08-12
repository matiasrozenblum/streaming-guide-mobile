import api from './api';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'device_uuid';

/**
 * Mirrors whether the backend currently holds a push subscription for this
 * device. Push registration is device-scoped and outlives the JWT entirely, so
 * without a local record of it the app cannot tell that it owes the backend an
 * unsubscribe — which is how a logged-out device kept receiving notifications.
 */
const FCM_REGISTERED_KEY = '@fcm_registered';

export const DeviceService = {
    async getDeviceId(): Promise<string> {
        let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
        if (!deviceId) {
            deviceId = Crypto.randomUUID();
            await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
        }
        return deviceId;
    },

    /**
     * True when the backend may still hold a push subscription for this device.
     *
     * Absent flag counts as "maybe": devices that were already stranded before
     * this flag existed — subscribed on the backend, with no session on the
     * device — have nothing written here, and defaulting to false would leave
     * exactly those users receiving notifications forever. The unsubscribe is
     * idempotent and the flag is written on the first attempt, so this costs at
     * most one request per install.
     */
    async isFCMRegistered(): Promise<boolean> {
        try {
            return (await AsyncStorage.getItem(FCM_REGISTERED_KEY)) !== 'false';
        } catch {
            // If we cannot tell, assume registered so the unsubscribe is retried.
            return true;
        }
    },

    /**
     * Register device with the user account (JWT protected).
     * POST /subscriptions/device
     */
    async registerDevice(accessToken: string): Promise<{ deviceId: string } | null> {
        const deviceId = await this.getDeviceId();

        try {
            const response = await api.post('/subscriptions/device', { deviceId }, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            console.log('Device registered successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to register device:', error);
            return null;
        }
    },

    /**
     * Register FCM token for push notifications.
     * POST /push/fcm/subscribe
     */
    async registerFCM(fcmToken: string): Promise<boolean> {
        const deviceId = await this.getDeviceId();
        const platform: 'ios' | 'android' | 'web' = Platform.OS === 'ios' ? 'ios' : 'android';

        try {
            await api.post('/push/fcm/subscribe', {
                deviceId,
                fcmToken,
                platform,
            });
            await AsyncStorage.setItem(FCM_REGISTERED_KEY, 'true');
            console.log('FCM subscription registered successfully');
            return true;
        } catch (error) {
            console.error('Failed to register FCM subscription:', error);
            return false;
        }
    },

    /**
     * Unregister FCM token.
     * POST /push/fcm/unsubscribe
     *
     * Returns whether the backend confirmed the unsubscribe. The local flag is
     * only cleared on success, so a failed attempt (offline at logout time) is
     * retried on the next cold start instead of leaving the device subscribed
     * forever.
     */
    async unregisterFCM(): Promise<boolean> {
        const deviceId = await this.getDeviceId();

        try {
            await api.post('/push/fcm/unsubscribe', { deviceId });
            await AsyncStorage.setItem(FCM_REGISTERED_KEY, 'false');
            console.log('FCM subscription removed');
            return true;
        } catch (error) {
            console.error('Failed to unregister FCM:', error);
            return false;
        }
    },
};
