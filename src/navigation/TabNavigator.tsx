import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { StreamersScreen } from '../screens/StreamersScreen';
import { getTheme } from '../theme';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    const theme = getTheme('dark');

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
                    height: Platform.OS === 'ios' ? 92 : 76,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
                    paddingTop: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 8,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: -2,
                    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
                },
                tabBarBackground: undefined
            }}
        >
            <Tab.Screen
                name="Canales"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="schedule" size={28} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Streamers"
                component={StreamersScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="live-tv" size={28} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
