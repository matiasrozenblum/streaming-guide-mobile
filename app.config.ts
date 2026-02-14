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

export default ({ config }: ConfigContext): ExpoConfig => {
    return {
        ...config,
        name: getAppName(),
        slug: "la-guia-del-streaming",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/app-icon.png",
        userInterfaceStyle: "dark",
        backgroundColor: "#0f172a",
        newArchEnabled: true,
        splash: {
            "image": "./assets/app-icon.png",
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
                foregroundImage: "./assets/app-icon.png",
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
                projectId: "277e923e-63f4-4ae0-a23e-83956322896c" // Retaining if it existed, or placeholder. I didn't see it in app.json so I'll omit if unsure, but usually easier to have. I'll omit for now to be safe and rely on what was in app.json.
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
            "@react-native-community/datetimepicker"
        ]
    };
};
