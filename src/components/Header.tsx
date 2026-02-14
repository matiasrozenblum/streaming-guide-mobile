import React from 'react';
import { View, Image, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { UserMenu } from './UserMenu';
import { LoginModal } from './LoginModal';
import { useLoginModal } from '../context/LoginModalContext';

export const Header = () => {
    const { visible: loginModalVisible, show: showLogin, hide: hideLogin } = useLoginModal();

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Image
                    source={require('../../assets/logo-white.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <View style={styles.rightActions}>
                    <UserMenu onLoginPress={showLogin} />
                </View>
            </View>
            <LoginModal
                visible={loginModalVisible}
                onDismiss={hideLogin}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E293B',
        // Removed paddingTop statusbar logic as it likely causes double padding if SafeAreaView is used or if Translucent is not handled this way
        // We will rely on SafeAreaView or standard header height
        height: 65, // ~7.75vh match
        zIndex: 100,
        borderBottomWidth: 1,
        borderBottomColor: '#1f2937',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    logo: {
        width: 160, // Increased to match 8.25vh relative proportion
        height: 50, // Increased
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
