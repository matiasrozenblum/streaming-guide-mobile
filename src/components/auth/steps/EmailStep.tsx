import React, { useState } from 'react';
import { View, StyleSheet, Platform, TextInput as NativeTextInput } from 'react-native';
import { Button, HelperText, Divider, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmailStepProps {
    initialEmail?: string;
    onSubmit: (email: string) => void;
    onAppleLogin?: () => void;
    onGoogleLogin?: () => void;
    isLoading: boolean;
    error?: string;
}

export const EmailStep = ({ initialEmail = '', onSubmit, onAppleLogin, onGoogleLogin, isLoading, error }: EmailStepProps) => {
    const [email, setEmail] = useState(initialEmail);
    const [localError, setLocalError] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const theme = useTheme();

    const handleSubmit = () => {
        if (!email) {
            setLocalError('Por favor ingresa tu correo electrónico');
            return;
        }
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(email)) {
            setLocalError('Correo electrónico inválido');
            return;
        }
        setLocalError('');
        onSubmit(email.trim());
    };

    return (
        <View style={styles.container}>
            <View style={[
                styles.inputContainer,
                {
                    borderColor: isFocused ? theme.colors.primary : theme.colors.outline,
                    borderWidth: isFocused ? 2 : 1,
                },
            ]}>
                <MaterialCommunityIcons
                    name="email-outline"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.inputIcon}
                />
                <NativeTextInput
                    placeholder="Correo electrónico"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        if (localError) setLocalError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    editable={!isLoading}
                    style={[styles.nativeInput, { color: theme.colors.onSurface }]}
                    returnKeyType="done"
                    multiline={false}
                    numberOfLines={1}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
            </View>

            {(localError || error) ? (
                <HelperText type="error" visible>
                    {localError || error}
                </HelperText>
            ) : null}

            <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                contentStyle={styles.buttonContent}

            >
                Continuar
            </Button>

            <View style={styles.dividerContainer}>
                <Divider style={styles.divider} />
                <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>o</Text>
                <Divider style={styles.divider} />
            </View>

            <View style={styles.socialContainer}>
                {Platform.OS === 'ios' && (
                    <Button
                        mode="outlined"
                        icon="apple"
                        onPress={onAppleLogin}
                        style={styles.socialButton}
                        textColor={theme.colors.onSurface}
                    >
                        Conectate con Apple
                    </Button>
                )}
                <Button
                    mode="outlined"
                    icon="google"
                    onPress={onGoogleLogin}
                    style={styles.socialButton}
                    textColor={theme.colors.onSurface}
                >
                    Conectate con Google
                </Button>
            </View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 4,
        paddingHorizontal: 12,
        height: 56,
    },
    inputIcon: {
        marginRight: 10,
    },
    nativeInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    button: {
        marginTop: 8,
        borderRadius: 6,
    },
    buttonContent: {
        paddingVertical: 6,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    divider: {
        flex: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontWeight: '600',
    },
    socialContainer: {
        gap: 12,
    },
    socialButton: {
        borderRadius: 6,
        borderColor: 'rgba(241,245,249,1)',
    },
});
