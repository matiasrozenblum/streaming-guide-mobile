import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { ProfileScreen } from '../screens/ProfileScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    headerShown: true,
                    title: 'Mi perfil',
                    headerBackTitle: 'Inicio',
                    headerStyle: { backgroundColor: '#111827' },
                    headerTintColor: '#fff'
                }}
            />
            <Stack.Screen
                name="Favorites"
                component={FavoritesScreen}
                options={{
                    headerShown: true,
                    title: 'Favoritos',
                    headerBackTitle: 'Inicio',
                    headerStyle: { backgroundColor: '#111827' },
                    headerTintColor: '#fff'
                }}
            />
        </Stack.Navigator>
    );
};
