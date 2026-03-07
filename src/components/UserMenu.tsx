import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu, Avatar, Divider, Text, useTheme, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

interface UserMenuProps {
    onLoginPress?: () => void;
}

export const UserMenu = ({ onLoginPress }: UserMenuProps) => {
    const [visible, setVisible] = useState(false);
    const navigation = useNavigation<any>();
    const theme = useTheme();
    const { session, isAuthenticated, logout } = useAuth();

    const openMenu = () => setVisible(true);
    const closeMenu = () => setVisible(false);

    const handleLogout = async () => {
        closeMenu();
        await logout();
    };

    // If not authenticated, show login button
    if (!isAuthenticated || !session) {
        return (
            <IconButton
                icon="account"
                mode="contained"
                containerColor="rgba(255,255,255,0.1)"
                iconColor="#9ca3af"
                size={24}
                onPress={onLoginPress}
                style={styles.loginIconButton}
            />
        );
    }

    const user = session.user;
    const firstName = user.firstName || user.name?.split(' ')[0] || 'Usuario';
    const initial = user.firstName?.[0]?.toUpperCase() || user.name?.[0]?.toUpperCase() || 'U';

    return (
        <View style={styles.container}>
            <Menu
                visible={visible}
                onDismiss={closeMenu}
                anchor={
                    <TouchableOpacity onPress={openMenu} style={styles.button}>
                        <Avatar.Text
                            size={32}
                            label={initial}
                            style={{ backgroundColor: '#2563eb' }}
                            color="white"
                        />
                        {/* Desktop-like view on larger screens could show name, but sticking to mobile first */}
                    </TouchableOpacity>
                }
                contentStyle={styles.menuContent}
            >
                <View style={styles.header}>
                    <Text style={styles.greeting}>¡Hola, {firstName}!</Text>
                </View>
                <Divider style={styles.divider} />
                <Menu.Item
                    onPress={() => { closeMenu(); navigation.navigate('Profile'); }}
                    title="Mi perfil"
                    leadingIcon="account"
                    titleStyle={styles.menuItemTitle}
                />
                <Menu.Item
                    onPress={() => { closeMenu(); navigation.navigate('Favorites'); }}
                    title="Favoritos"
                    leadingIcon="heart"
                    titleStyle={styles.menuItemTitle}
                />
                <Divider style={styles.divider} />
                <Menu.Item
                    onPress={handleLogout}
                    title="Salir"
                    leadingIcon="logout"
                    titleStyle={[styles.menuItemTitle, { color: '#ef4444' }]}
                />
            </Menu>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    button: {
        borderRadius: 16,
        padding: 2,
    },
    loginIconButton: {
        marginRight: 8,
        margin: 0,
        backgroundColor: 'rgba(255,255,255,0.1)',
        width: 40,
        height: 40,
    },
    menuContent: {
        backgroundColor: '#1f2937', // Dark mode bg
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginTop: 40,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    greeting: {
        color: '#f3f4f6',
        fontWeight: '600',
        fontSize: 16,
    },
    divider: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    menuItemTitle: {
        color: '#e5e7eb',
        fontSize: 15,
    }
});
