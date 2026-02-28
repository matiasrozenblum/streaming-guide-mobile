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
    return 'La Guía del Streaming';
};

const getApiUrl = () => {
    if (IS_STAGING) return 'https://streaming-guide-backend-staging.up.railway.app';
    if (IS_DEV) return 'http://10.0.2.2:3000'; // Default Android emulator localhost. Can be overridden if needed.
    return 'https://streaming-guide-backend-production.up.railway.app';
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
        version: "1.0.0",
        orientation: "portrait",
        icon: getAppIcon(),
        userInterfaceStyle: "dark",
        backgroundColor: "#0f172a",
        newArchEnabled: true,
        splash: {
            "image": getAppIcon(), // Optional: also change splash if desired
            "resizeMode": "contain",
            "backgroundColor": "#0f172a"
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: getUniqueIdentifier(),
            buildNumber: "2",
            googleServicesFile: IS_STAGING ? "./GoogleService-Info.staging.plist" : "./GoogleService-Info.plist",
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#0f172a"
            },
            package: getUniqueIdentifier(),
            googleServicesFile: "./google-services.json",
            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: false
        },
        web: {
            favicon: "./assets/favicon.png"
        },
        extra: {
            apiUrl: getApiUrl(),
            googleClientIds: {
                web: IS_STAGING
                    ? "590707167522-jtc5nmbc46q8g5lcr6es7gntj2b2ovg5.apps.googleusercontent.com"
                    : "590707167522-m5kua8q7h126c04fckcskk02m3m4vnsn.apps.googleusercontent.com",
                android: IS_STAGING
                    ? "590707167522-85ighs69s4tp0gij372ini31aheijtbd.apps.googleusercontent.com"
                    : "590707167522-igkgg74n6k7nvppmjbnu8pcje1g5ifkn.apps.googleusercontent.com",
                ios: IS_STAGING
                    ? "590707167522-17l29k73geo1ckud90i54rmmhclj3rjt.apps.googleusercontent.com"
                    : "590707167522-e19eo6tn3clq64em280amu6rfjeu0un5.apps.googleusercontent.com",
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
                        ? "com.googleusercontent.apps.590707167522-17l29k73geo1ckud90i54rmmhclj3rjt"
                        : "com.googleusercontent.apps.590707167522-e19eo6tn3clq64em280amu6rfjeu0un5"
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
            "expo-font"
        ]
    };
};
