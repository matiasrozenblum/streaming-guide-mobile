import PostHog from 'posthog-react-native';
import analytics from '@react-native-firebase/analytics';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import dayjs from 'dayjs';
import {
    DdSdkReactNative,
    DdRum,
    RumActionType,
    CoreConfiguration,
    RumConfiguration,
    TrackingConsent,
} from '@datadog/mobile-react-native';

let posthog: PostHog | null = null;
let _isAdminUser = false;
let _ddInitialized = false;

interface UserContext {
    user_id?: string;
    user_gender?: string;
    user_age?: number;
    user_age_group?: string;
    user_role?: string;
}

let _userContext: UserContext = {};

const getAgeGroup = (birthDate?: string): string => {
    if (!birthDate) return 'unknown';
    const age = dayjs().diff(dayjs(birthDate), 'year');
    if (age < 18) return 'under_18';
    if (age < 25) return '18_24';
    if (age < 35) return '25_34';
    if (age < 45) return '35_44';
    if (age < 55) return '45_54';
    if (age < 65) return '55_64';
    return '65_plus';
};

/**
 * Enable/disable analytics tracking for admin users.
 * When enabled, all tracking functions become no-ops to avoid polluting metrics.
 */
export const setAnalyticsAdminMode = async (isAdmin: boolean) => {
    _isAdminUser = isAdmin;
    if (isAdmin) {
        if (posthog) {
            posthog.optOut();
        }
        await analytics().setAnalyticsCollectionEnabled(false);
        console.log('🔇 Analytics disabled for admin user');
    } else {
        if (posthog) {
            posthog.optIn();
        }
        await analytics().setAnalyticsCollectionEnabled(true);
        console.log('🔊 Analytics re-enabled');
    }
};

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

        const isDevice = Device.isDevice;
        const appVersion = Application.nativeApplicationVersion || 'unknown';
        await analytics().setUserProperty('is_physical_device', String(isDevice));
        await analytics().setUserProperty('app_version', appVersion);
        console.log('✅ Firebase Analytics initialized');

        const ddAppId = Constants.expoConfig?.extra?.datadogAppId;
        const ddClientToken = Constants.expoConfig?.extra?.datadogClientToken;
        const ddEnv = Constants.expoConfig?.extra?.datadogEnv ?? 'staging';

        if (ddAppId && ddClientToken) {
            const rumConfig = new RumConfiguration(
                ddAppId,
                true, // trackInteractions
                true, // trackResources
                true  // trackErrors
            );
            rumConfig.sessionSampleRate = 100;
            rumConfig.nativeCrashReportEnabled = true;

            const config = new CoreConfiguration(
                ddClientToken,
                ddEnv,
                TrackingConsent.GRANTED
            );
            config.site = 'datadoghq.com';
            config.service = 'la-guia-del-streaming-mobile';
            config.version = appVersion;
            config.rumConfiguration = rumConfig;

            await DdSdkReactNative.initialize(config);
            _ddInitialized = true;
            console.log('✅ Datadog RUM initialized');
        } else {
            console.warn('⚠️ Datadog credentials missing. Datadog RUM will not be initialized.');
        }
    } catch (error) {
        console.error('❌ Failed to initialize analytics:', error);
    }
};

/**
 * Identify a user with PostHog, Firebase Analytics, and Datadog RUM.
 */
export const identifyUser = async (userId: string, properties?: Record<string, any>) => {
    if (_isAdminUser) return;
    try {
        if (posthog) {
            posthog.identify(userId, properties);
        }
        await analytics().setUserId(userId);
        if (properties) {
            const stringProperties = Object.entries(properties).reduce((acc, [key, value]) => {
                acc[key] = String(value);
                return acc;
            }, {} as Record<string, string>);
            await analytics().setUserProperties(stringProperties);
        }

        if (_ddInitialized) {
            try {
                await DdSdkReactNative.setUserInfo({
                    id: userId,
                    name: properties?.name,
                    email: properties?.email,
                    extraInfo: {
                        gender: properties?.gender,
                        role: properties?.role,
                        age_group: getAgeGroup(properties?.birthDate),
                    },
                });
            } catch (e) {
                console.warn('[Datadog] setUserInfo error:', e);
            }
        }

        _userContext = {
            user_id: userId,
            user_gender: properties?.gender,
            user_age: properties?.birthDate
                ? dayjs().diff(dayjs(properties.birthDate), 'year')
                : undefined,
            user_age_group: getAgeGroup(properties?.birthDate),
            user_role: properties?.role,
        };
    } catch (error) {
        console.error('Failed to identify user in analytics:', error);
    }
};

/**
 * Track a page/screen view across PostHog, Firebase Analytics, and Datadog RUM.
 */
export const trackScreen = async (screenName: string, screenClass?: string) => {
    if (_isAdminUser) return;
    try {
        if (posthog) {
            posthog.screen(screenName);
        }
        await analytics().logScreenView({
            screen_name: screenName,
            screen_class: screenClass || screenName,
        });

        if (_ddInitialized) {
            try {
                await DdRum.startView(screenName, screenName);
            } catch (e) {
                console.warn('[Datadog] startView error:', e);
            }
        }
    } catch (error) {
        console.error(`Failed to track screen ${screenName} in analytics:`, error);
    }
};

/**
 * Track a custom event across PostHog, Firebase Analytics, and Datadog RUM.
 */
export const trackEvent = async (eventName: string, properties?: Record<string, any>) => {
    if (_isAdminUser) return;
    try {
        if (posthog) {
            posthog.capture(eventName, properties);
        }
        await analytics().logEvent(eventName, properties);

        if (_ddInitialized) {
            try {
                await DdRum.addAction(RumActionType.CUSTOM, eventName, {
                    ...properties,
                    ..._userContext,
                });
            } catch (e) {
                console.warn('[Datadog] addAction error:', e);
            }
        }
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

        if (_ddInitialized) {
            try {
                await DdSdkReactNative.clearUserInfo();
            } catch (e) {
                console.warn('[Datadog] clearUserInfo error:', e);
            }
        }

        _userContext = {};
    } catch (error) {
        console.error('Failed to reset analytics:', error);
    }
};
