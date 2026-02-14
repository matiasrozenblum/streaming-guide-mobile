import api from './api';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'device_uuid';

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
     */
    async unregisterFCM(): Promise<void> {
        const deviceId = await this.getDeviceId();

        try {
            await api.post('/push/fcm/unsubscribe', { deviceId });
            console.log('FCM subscription removed');
        } catch (error) {
            console.error('Failed to unregister FCM:', error);
        }
    },
};
