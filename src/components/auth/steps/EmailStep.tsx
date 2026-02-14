import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText, Divider, Text, useTheme } from 'react-native-paper';

interface EmailStepProps {
    initialEmail?: string;
    onSubmit: (email: string) => void;
    isLoading: boolean;
    error?: string;
}

export const EmailStep = ({ initialEmail = '', onSubmit, isLoading, error }: EmailStepProps) => {
    const [email, setEmail] = useState(initialEmail);
    const [localError, setLocalError] = useState('');
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
            {/* Title is handled by the parent Modal usually, but we can add it here if structure changes. 
          The web version has the title in DialogTitle. Mobile LoginModal has it inside renderEmailStep.
          We'll assume the parent handles the main title or we add it here? 
          For now, let's keep it pure to the input form to match web "EmailStep" which doesn't have the title.
      */}

            <TextInput
                label="Correo electrónico"
                placeholder="ejemplo@correo.com"
                value={email}
                onChangeText={(text) => {
                    setEmail(text);
                    if (localError) setLocalError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                mode="outlined"
                disabled={isLoading}
                left={<TextInput.Icon icon="email-outline" />}
                style={styles.input}
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
                <Button
                    mode="outlined"
                    icon="google"
                    onPress={() => setLocalError('Google login no disponible en esta versión')}
                    style={styles.socialButton}
                    textColor={theme.colors.onSurface}
                >
                    Conectate con Google
                </Button>
                {/* Facebook button commented out in web, so we leave it out here too */}
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
    button: {
        marginTop: 8,
        borderRadius: 6, // Matches web 1.5 (approx 12px or 6-8px depending on scale)
    },
    buttonContent: {
        paddingVertical: 6,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8, // reduced from 16 to match web compact look
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
        borderColor: 'rgba(255,255,255,0.2)', // approximate matched border
    },
});
