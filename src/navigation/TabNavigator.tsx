import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { StreamersScreen } from '../screens/StreamersScreen';
import { getTheme } from '../theme';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const theme = getTheme('dark');
    const insets = useSafeAreaInsets();

    // Set Android system navigation bar to match app theme
    useEffect(() => {
        if (Platform.OS === 'android') {
            NavigationBar.setBackgroundColorAsync(theme.colors.background);
            NavigationBar.setButtonStyleAsync('light');
        }
    }, []);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.background, // #0F172A
                    borderTopColor: theme.colors.border,
                    borderTopWidth: 1,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: Platform.OS === 'android' ? 68 + insets.bottom : 68,
                    paddingBottom: Platform.OS === 'android' ? insets.bottom + 8 : 8,
                    paddingTop: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 8,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarItemStyle: {
                    paddingTop: 0,
                    paddingBottom: 4,
                },
                tabBarIconStyle: {
                    width: 34,
                    height: 34,
                },
                tabBarLabelStyle: {
                    fontSize: 13,
                    fontWeight: '600',
                    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
                    marginTop: -4,
                },
                tabBarBackground: undefined
            }}
        >
            <Tab.Screen
                name="Canales"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="schedule" size={32} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Streamers"
                component={StreamersScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="live-tv" size={32} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
