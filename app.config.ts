import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview'; // EAS 'preview' profile often matches staging
const IS_STAGING = process.env.APP_VARIANT === 'staging';

const getUniqueIdentifier = () => {
    if (IS_STAGING) {
        return 'com.laguiadelstreaming.app.staging';
    }
    if (IS_DEV) {
        return 'com.laguiadelstreaming.app.dev';
    }
    return 'com.laguiadelstreaming.app';
};

const getAppName = () => {
    if (IS_STAGING) {
        return 'La Guía (Staging)';
    }
    if (IS_DEV) {
        return 'La Guía (Dev)';
    }
    return 'La Guía';
};

const getApiUrl = () => {
    if (IS_STAGING) return 'https://streaming-guide-backend-staging.up.railway.app';
    if (IS_DEV) return 'http://10.0.2.2:3000'; // Default Android emulator localhost. Can be overridden if needed.
    return 'https://streaming-guide-backend-production.up.railway.app';
};

/**
 * The website, which is where the recap placas are rendered.
 *
 * The placa is one component drawn at 1080x1920 and exported as a PNG; the app
 * downloads that PNG rather than redrawing the design a third time, so what
 * gets shared from a phone is byte-for-byte what the site shows.
 */
const getWebUrl = () => {
    if (IS_STAGING || IS_DEV) return 'https://staging.laguiadelstreaming.com';
    return 'https://laguiadelstreaming.com';
};

/** The apps the share sheet is allowed to look for and hand a placa to. */
const SHARE_TARGETS = {
    ios: ['instagram', 'instagram-stories', 'whatsapp', 'twitter', 'fb'],
    android: [
        'com.instagram.android',
        'com.whatsapp',
        'com.twitter.android',
        'com.facebook.katana',
    ],
};

const getAppIcon = () => {
    if (IS_STAGING) {
        return "./assets/app-icon-staging.png"; // Make sure this file exists!
    }
    return "./assets/app-icon.png";
};

const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const withManifestMessagingFix = (config) => {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;
        const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

        // Ensure 'tools' namespace is available
        if (!androidManifest.manifest.$['xmlns:tools']) {
            androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
        }

        const metaDataList = mainApplication['meta-data'] || [];

        const requiredItems = [
            {
                name: 'com.google.firebase.messaging.default_notification_channel_id',
                value: 'streaming_alerts',
                replace: 'android:value'
            },
            {
                name: 'com.google.firebase.messaging.default_notification_icon',
                resource: '@drawable/notification_icon',
                replace: 'android:resource'
            },
            {
                name: 'com.google.firebase.messaging.default_notification_color',
                resource: '@color/notification_icon_color',
                replace: 'android:resource'
            }
        ];

        requiredItems.forEach(item => {
            let existing = metaDataList.find(md => md.$['android:name'] === item.name);
            if (existing) {
                let currentReplace = existing.$['tools:replace'];
                if (currentReplace) {
                    if (!currentReplace.includes(item.replace)) {
                        existing.$['tools:replace'] = `${currentReplace},${item.replace}`;
                    }
                } else {
                    existing.$['tools:replace'] = item.replace;
                }
            } else {
                const newItem = {
                    $: {
                        'android:name': item.name,
                        'tools:replace': item.replace
                    }
                };
                if (item.value) newItem.$['android:value'] = item.value;
                if (item.resource) newItem.$['android:resource'] = item.resource;

                metaDataList.push(newItem);
            }
        });

        return config;
    });
};

export default ({ config }: ConfigContext): ExpoConfig => {
    return {
        ...config,
        name: getAppName(),
        slug: "la-guia-del-streaming",
        version: "1.1.0",
        orientation: "portrait",
        icon: getAppIcon(),
        userInterfaceStyle: "dark",
        backgroundColor: "#0f172a",
        newArchEnabled: true,
        splash: {
            "image": "./assets/splash-icon.png",
            "resizeMode": "contain",
            "backgroundColor": "#0f172a"
        },
        ios: {
            supportsTablet: false,
            bundleIdentifier: getUniqueIdentifier(),
            googleServicesFile: IS_STAGING ? "./GoogleService-Info.staging.plist" : "./GoogleService-Info.plist",
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false,
                CFBundleDisplayName: getAppName(),
                CFBundleName: "La Guía",
                // LSApplicationQueriesSchemes is not listed here on purpose: the
                // react-native-share plugin appends its own `ios` list to this
                // key, so declaring the schemes in both places just writes every
                // one of them twice.
                NSPhotoLibraryAddUsageDescription:
                    "Para guardar en tu carrete las placas de Mi resumen que elijas descargar."
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#0f172a"
            },
            package: getUniqueIdentifier(),
            // Android 11+ hides other apps unless they are declared, which is
            // what lets the per-network buttons know where they can send a placa.
            queries: SHARE_TARGETS.android.map((packageName) => ({ package: packageName })),
            googleServicesFile: "./google-services.json",
            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: false,
        },
        web: {
            favicon: "./assets/favicon.png"
        },
        extra: {
            apiUrl: getApiUrl(),
            webUrl: getWebUrl(),
            /**
             * Instagram refuses a Stories share without a registered Facebook
             * app id. Empty is a supported state: the Instagram button falls
             * back to the system share sheet and says so.
             */
            facebookAppId: process.env.FACEBOOK_APP_ID ?? '',
            posthogApiKey: "phc_ioX3gwDuENT8MoUWSacARsCFVE6bSbKaEh5u7Mie5oK",
            posthogHost: "https://app.posthog.com",
            datadogAppId: process.env.DATADOG_APP_ID ?? '',
            datadogClientToken: process.env.DATADOG_CLIENT_TOKEN ?? '',
            datadogEnv: IS_STAGING || IS_DEV ? 'staging' : 'production',
            googleClientIds: {
                web: IS_STAGING
                    ? "699504194906-v8uledkb0e19qbkav7t8b9hcae3cb6cm.apps.googleusercontent.com"
                    : "699504194906-v8uledkb0e19qbkav7t8b9hcae3cb6cm.apps.googleusercontent.com",
                android: IS_STAGING
                    ? "699504194906-ithd0rg3keitq0vdq3hk8id9hjvjrcvl.apps.googleusercontent.com"
                    : "699504194906-vickf8rsufqq4jibroc1m4l14v44kh8g.apps.googleusercontent.com",
                ios: IS_STAGING
                    ? "699504194906-kcgb0s01l47aa999gc9a99h7fbtv3p74.apps.googleusercontent.com"
                    : "699504194906-02d0grusldi5d0cf9d3n0bnutd2l22b1.apps.googleusercontent.com",
            },
            eas: {
                projectId: "c6349d70-6b66-4fe3-b121-18d7ee5670bd"
            }
        },
        plugins: [
            [
                "expo-build-properties",
                {
                    "ios": {
                        "deploymentTarget": "15.1"
                    }
                }
            ],
            [
                "@react-native-google-signin/google-signin",
                {
                    "iosUrlScheme": IS_STAGING
                        ? "com.googleusercontent.apps.699504194906-kcgb0s01l47aa999gc9a99h7fbtv3p74"
                        : "com.googleusercontent.apps.699504194906-02d0grusldi5d0cf9d3n0bnutd2l22b1"
                }
            ],
            "@react-native-firebase/app",
            "@react-native-firebase/messaging",
            [
                "expo-notifications",
                {
                    "icon": "./assets/notification-icon.png",
                    "color": "#2563eb",
                    "defaultChannel": "streaming_alerts"
                }
            ],
            "./plugins/withModularHeaders.js",
            withManifestMessagingFix,
            "@react-native-community/datetimepicker",
            "expo-font",
            "expo-web-browser",
            [
                "react-native-share",
                {
                    ios: SHARE_TARGETS.ios,
                    android: SHARE_TARGETS.android,
                    enableBase64ShareAndroid: true
                }
            ],
            [
                "expo-media-library",
                {
                    savePhotosPermission:
                        "Para guardar en tu carrete las placas de Mi resumen que elijas descargar.",
                    isAccessMediaLocationEnabled: false
                }
            ]
        ]
    };
};
