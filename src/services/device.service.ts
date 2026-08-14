import axios from 'axios';
import api from './api';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'device_uuid';

/**
 * Outcome of a backend registration call.
 *
 * The distinction that matters is `rejected` vs `unavailable`. Collapsing both into
 * a null return meant a caller could not tell "the backend says this session is
 * gone, do not register this device for push" from "the network blipped". Treating
 * the second as the first silently drops push registration for the whole session;
 * treating the first as the second is how a logged-out device ends up subscribed.
 */
export type RegistrationResult =
    /** The backend accepted the call. */
    | { status: 'ok' }
    /** The backend refused: the session is over, or this device is not ours. */
    | { status: 'rejected' }
    /** Could not reach the backend, or it errored. Safe to retry. */
    | { status: 'unavailable' };

const classifyError = (error: unknown, label: string): RegistrationResult => {
    if (axios.isAxiosError(error)) {
        const httpStatus = error.response?.status;
        if (httpStatus === 401 || httpStatus === 403) {
            console.warn(`${label} rejected by backend (${httpStatus})`);
            return { status: 'rejected' };
        }
    }
    console.error(`${label} failed:`, error);
    return { status: 'unavailable' };
};

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
    async registerDevice(accessToken: string): Promise<RegistrationResult> {
        const deviceId = await this.getDeviceId();
        // The backend has always accepted these; not sending them left
        // devices.platform and devices.app_version NULL for every row, which
        // made it impossible to answer "which builds are still out there?"
        // from the database.
        const platform: 'ios' | 'android' | 'web' = Platform.OS === 'ios' ? 'ios' : 'android';
        const appVersion = Application.nativeApplicationVersion ?? undefined;

        try {
            const response = await api.post('/subscriptions/device', { deviceId, platform, appVersion }, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            console.log('Device registered successfully:', response.data);
            return { status: 'ok' };
        } catch (error) {
            return classifyError(error, 'Device registration');
        }
    },

    /**
     * Register FCM token for push notifications.
     * POST /push/fcm/subscribe
     */
    async registerFCM(fcmToken: string): Promise<RegistrationResult> {
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
            return { status: 'ok' };
        } catch (error) {
            // Once the backend enforces device ownership this returns 401 for a
            // device that belongs to someone else — retrying that is pointless.
            return classifyError(error, 'FCM subscription');
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
