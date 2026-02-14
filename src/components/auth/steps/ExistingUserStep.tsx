import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Button, HelperText, Text, useTheme } from 'react-native-paper';

interface ExistingUserStepProps {
    email: string;
    firstName?: string;
    gender?: string;
    onSubmit: (password: string) => void;
    onBack: () => void;
    isLoading: boolean;
    error?: string;
    onForgotPassword: () => void;
}

export const ExistingUserStep = ({
    email,
    firstName,
    gender,
    onSubmit,
    onBack,
    isLoading,
    error,
    onForgotPassword
}: ExistingUserStepProps) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');
    const theme = useTheme();

    const getWelcomeMessage = () => {
        if (!firstName) {
            return (
                <Text style={styles.welcomeText}>¡Bienvenido de nuevo, <Text style={{ fontWeight: 'bold' }}>{email}</Text>!</Text>
            );
        }

        let suffix = 'o';
        if (gender === 'female' || gender === 'femenino' || gender === 'F') suffix = 'a';
        if (gender === 'non_binary' || gender === 'no_binario' || gender === 'O') suffix = '@';
        if (!gender || gender === 'rather_not_say' || gender === 'prefiero_no_decir' || gender === 'N') suffix = '@';

        return (
            <Text style={styles.welcomeText}>¡Bienvenid{suffix} de nuevo, <Text style={{ fontWeight: 'bold' }}>{firstName}</Text>!</Text>
        );
    };

    const handleSubmit = () => {
        if (!password) {
            setLocalError('Ingresa tu contraseña');
            return;
        }
        setLocalError('');
        onSubmit(password);
    };

    return (
        <View style={styles.container}>
            <View style={styles.welcomeContainer}>
                {getWelcomeMessage()}
            </View>

            <TextInput
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                mode="outlined"
                style={styles.input}
                disabled={isLoading}
                right={
                    <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowPassword(!showPassword)}
                    />
                }
                left={<TextInput.Icon icon="lock-outline" />}
            />

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

            >
                Iniciar sesión
            </Button>

            <Button
                mode="outlined"
                onPress={onBack}
                disabled={isLoading}
                style={[styles.button, styles.cancelButton]}
                icon="arrow-left"
            >
                Volver
            </Button>

            <TouchableOpacity onPress={onForgotPassword} disabled={isLoading} style={styles.forgotButton}>
                <Text style={{ color: theme.colors.primary }}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    welcomeContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    welcomeText: {
        textAlign: 'center',
        fontSize: 16,
    },
    input: {
        backgroundColor: 'transparent',
    },
    button: {
        borderRadius: 6,
    },
    cancelButton: {
        borderColor: 'rgba(255,255,255,0.2)',
    },
    forgotButton: {
        alignItems: 'center',
        marginTop: 8,
    },
});
