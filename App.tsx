import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { VideoPlayerProvider } from './src/context/VideoPlayerContext';
import { AuthProvider } from './src/context/AuthContext';
import { LoginModalProvider } from './src/context/LoginModalContext';
import { MobileVideoPlayer } from './src/components/VideoPlayer/MobileVideoPlayer';
import { paperDarkTheme } from './src/theme';

function AppContent() {
  usePushNotifications();

  return (
    <LoginModalProvider>
      <VideoPlayerProvider>
        <NavigationContainer>
          <RootNavigator />
          <MobileVideoPlayer />
        </NavigationContainer>
      </VideoPlayerProvider>
    </LoginModalProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PaperProvider theme={paperDarkTheme}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </PaperProvider>
    </Provider>
  );
}
