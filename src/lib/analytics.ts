import PostHog from 'posthog-react-native';
import analytics from '@react-native-firebase/analytics';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';

let posthog: PostHog | null = null;

export const initAnalytics = async () => {
    try {
        const apiKey = Constants.expoConfig?.extra?.posthogApiKey;
        const host = Constants.expoConfig?.extra?.posthogHost;

        if (apiKey) {
            posthog = new PostHog(apiKey, {
                host: host || 'https://app.posthog.com',
                captureAppLifecycleEvents: true,
            });
            console.log('✅ PostHog Analytics initialized');
        } else {
            console.warn('⚠️ PostHog API Key is missing. Analytics will only use Firebase.');
        }

        // Initialize Firebase Analytics (set some basic properties automatically if needed)
        const isDevice = Device.isDevice;
        const appVersion = Application.nativeApplicationVersion || 'unknown';
        await analytics().setUserProperty('is_physical_device', String(isDevice));
        await analytics().setUserProperty('app_version', appVersion);
        console.log('✅ Firebase Analytics initialized');
    } catch (error) {
        console.error('❌ Failed to initialize analytics:', error);
    }
};

/**
 * Identify a user with both PostHog and Firebase Analytics.
 */
export const identifyUser = async (userId: string, properties?: Record<string, any>) => {
    try {
        if (posthog) {
            posthog.identify(userId, properties);
        }
        await analytics().setUserId(userId);
        if (properties) {
            // Firebase Analytics properties must be strings
            const stringProperties = Object.entries(properties).reduce((acc, [key, value]) => {
                acc[key] = String(value);
                return acc;
            }, {} as Record<string, string>);
            await analytics().setUserProperties(stringProperties);
        }
    } catch (error) {
        console.error('Failed to identify user in analytics:', error);
    }
};

/**
 * Track a page/screen view.
 */
export const trackScreen = async (screenName: string, screenClass?: string) => {
    try {
        if (posthog) {
            posthog.screen(screenName);
        }
        await analytics().logScreenView({
            screen_name: screenName,
            screen_class: screenClass || screenName,
        });
    } catch (error) {
        console.error(`Failed to track screen ${screenName} in analytics:`, error);
    }
};

/**
 * Track a custom event to both PostHog and Firebase Analytics.
 */
export const trackEvent = async (eventName: string, properties?: Record<string, any>) => {
    try {
        if (posthog) {
            posthog.capture(eventName, properties);
        }

        // Firebase event parameters cannot be strictly typed and deeply nested like PostHog
        // so we just pass standard properties.
        await analytics().logEvent(eventName, properties);
    } catch (error) {
        console.error(`Failed to track event ${eventName} in analytics:`, error);
    }
};

/**
 * Reset analytics state (e.g., on logout).
 */
export const resetAnalytics = async () => {
    try {
        if (posthog) {
            posthog.reset();
        }
    } catch (error) {
        console.error('Failed to reset analytics:', error);
    }
};
