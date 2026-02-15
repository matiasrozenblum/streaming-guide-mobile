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
            googleServicesFile: IS_STAGING ? "./GoogleService-Info.staging.plist" : "./GoogleService-Info.plist"
        },
        android: {
            adaptiveIcon: {
                foregroundImage: getAppIcon(),
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
            "@react-native-firebase/app",
            "@react-native-firebase/messaging",
            [
                "expo-notifications",
                {
                    "icon": "./assets/app-icon.png",
                    "color": "#2563eb",
                    "defaultChannel": "streaming_alerts"
                }
            ],
            "./plugins/withModularHeaders.js",
            "./plugins/withManifestMessagingFix.js",
            "@react-native-community/datetimepicker"
        ]
    };
};
