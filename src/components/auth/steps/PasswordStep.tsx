import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText, ProgressBar, Text, useTheme } from 'react-native-paper';

interface PasswordStepProps {
    onSubmit: (password: string) => void;
    onBack: () => void;
    isLoading: boolean;
    error?: string;
    submitLabel?: string;
}

export const PasswordStep = ({
    onSubmit,
    onBack,
    isLoading,
    error,
    submitLabel = 'Registrarme'
}: PasswordStepProps) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [localError, setLocalError] = useState('');
    const [strength, setStrength] = useState(0);

    const theme = useTheme();

    // Calculate strength matches web logic
    useEffect(() => {
        let s = 0;
        if (password.length >= 8) s++;
        if (/[A-Z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[^A-Za-z0-9]/.test(password)) s++;
        setStrength(Math.min(s, 4));
    }, [password]);

    const handleSubmit = () => {
        if (password.length < 8) { // Mobile original said 8, web said 6, but mobile original check was 8. I'll stick to web's 6 or mobile's 8? Web code says: `if (pass.length < 6)`. Mobile original says 8.
            // I'll stick to 6 to match Web.
            if (password.length < 6) {
                setLocalError('La contraseña debe tener al menos 6 caracteres');
                return;
            }
        }
        if (password !== confirmPassword) {
            setLocalError('Las contraseñas no coinciden');
            return;
        }
        setLocalError('');
        onSubmit(password);
    };

    const getStrengthColor = () => {
        if (strength <= 1) return theme.colors.error;
        if (strength <= 2) return theme.colors.error; // or orange if available
        return theme.colors.primary;
    };

    const getStrengthLabel = () => {
        return ['Muy débil', 'Débil', 'Media', 'Fuerte', 'Muy fuerte'][strength];
    };

    return (
        <View style={styles.container}>
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

            {password ? (
                <View style={styles.strengthContainer}>
                    <ProgressBar progress={(strength / 4)} color={getStrengthColor()} style={styles.progressBar} />
                    <Text style={styles.strengthText}>Fuerza: {getStrengthLabel()}</Text>
                </View>
            ) : null}

            <TextInput
                label="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                mode="outlined"
                style={styles.input}
                disabled={isLoading}
                right={
                    <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                }
                left={<TextInput.Icon icon="lock-outline" />}
            />

            {(localError || error) ? (
                <HelperText type="error" visible>
                    {localError || error}
                </HelperText>
            ) : null}

            <Text style={[styles.termsText, { color: theme.colors.secondary }]}>
                Al registrarte aceptás los términos y condiciones.
            </Text>

            <View style={styles.buttonContainer}>
                <Button
                    mode="outlined"
                    onPress={onBack}
                    disabled={isLoading}
                    style={[styles.button, styles.flexButton]}
                    icon="arrow-left"
                >
                    Volver
                </Button>
                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={isLoading}
                    disabled={isLoading || !password || !confirmPassword}
                    style={[styles.button, styles.flexButton]}

                >
                    {submitLabel}
                </Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    input: {
        backgroundColor: 'transparent',
    },
    strengthContainer: {
        gap: 4,
        marginTop: -8,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
    },
    strengthText: {
        fontSize: 12,
    },
    termsText: {
        fontSize: 12,
        textAlign: 'center',
        marginVertical: 4,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        borderRadius: 6,
    },
    flexButton: {
        flex: 1,
    },
});
