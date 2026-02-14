import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import App from './App';

// Tell expo-notifications to always display incoming notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Create Android notification channel at startup (before any notification arrives)
if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('streaming_alerts', {
        name: 'Alertas de Streaming',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
    });
}

// Register background handler (required for FCM to process background messages)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[Push] Background message received:', remoteMessage.notification?.title);
    // Notification display is handled automatically by FCM via the defaultChannel
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
