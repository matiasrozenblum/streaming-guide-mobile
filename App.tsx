import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initAnalytics, trackScreen, trackEvent } from './src/lib/analytics';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { VideoPlayerProvider } from './src/context/VideoPlayerContext';
import { AuthProvider } from './src/context/AuthContext';
import { LoginModalProvider } from './src/context/LoginModalContext';
import { MobileVideoPlayer } from './src/components/VideoPlayer/MobileVideoPlayer';
import { paperDarkTheme } from './src/theme';

function AppContent() {
  usePushNotifications();
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = React.useRef<string | undefined>(undefined);

  return (
    <LoginModalProvider>
      <VideoPlayerProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            routeNameRef.current = navigationRef.getCurrentRoute()?.name;
            if (routeNameRef.current) {
              trackScreen(routeNameRef.current);
            }
          }}
          onStateChange={async () => {
            const previousRouteName = routeNameRef.current;
            const currentRouteName = navigationRef.getCurrentRoute()?.name;

            if (previousRouteName !== currentRouteName && currentRouteName) {
              await trackScreen(currentRouteName);
              trackEvent('navigation_click', { action: 'navigation_click', click_url: currentRouteName });
            }
            routeNameRef.current = currentRouteName;
          }}
        >
          <RootNavigator />
          <MobileVideoPlayer />
        </NavigationContainer>
      </VideoPlayerProvider>
    </LoginModalProvider>
  );
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';

export default function App() {
  React.useEffect(() => {
    initAnalytics();
  }, []);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PaperProvider theme={paperDarkTheme}>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </PaperProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
