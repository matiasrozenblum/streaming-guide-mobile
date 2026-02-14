import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Button, HelperText, Text, useTheme } from 'react-native-paper';
import { authApi } from '../../../services/api';

interface CodeStepProps {
    email: string;
    initialCode?: string;
    onSubmit: (code: string) => void;
    onBack: () => void;
    isLoading: boolean;
    error?: string;
}

const OTP_LENGTH = 6;

export const CodeStep = ({ email, initialCode = '', onSubmit, onBack, isLoading, error }: CodeStepProps) => {
    const [digits, setDigits] = useState<string[]>(() => {
        const arr = initialCode.split('').slice(0, OTP_LENGTH);
        while (arr.length < OTP_LENGTH) arr.push('');
        return arr;
    });
    const [localError, setLocalError] = useState('');
    const [countdown, setCountdown] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const theme = useTheme();
    const inputRefs = useRef<(RNTextInput | null)[]>([]);

    useEffect(() => {
        if (countdown > 0 && !canResend) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
        if (countdown === 0) {
            setCanResend(true);
        }
    }, [countdown, canResend]);

    // Focus first input on mount
    useEffect(() => {
        setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }, []);

    const handleDigitChange = (text: string, index: number) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        if (localError) setLocalError('');

        // Handle paste of full code
        if (cleaned.length === OTP_LENGTH) {
            const newDigits = cleaned.split('');
            setDigits(newDigits);
            inputRefs.current[OTP_LENGTH - 1]?.focus();
            return;
        }

        if (cleaned.length > 1) {
            // Multi-char input (partial paste), fill from current index
            const newDigits = [...digits];
            for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i++) {
                newDigits[index + i] = cleaned[i];
            }
            setDigits(newDigits);
            const nextIdx = Math.min(index + cleaned.length, OTP_LENGTH - 1);
            inputRefs.current[nextIdx]?.focus();
            return;
        }

        const newDigits = [...digits];
        newDigits[index] = cleaned;
        setDigits(newDigits);

        // Auto-advance to next input
        if (cleaned && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace') {
            if (!digits[index] && index > 0) {
                const newDigits = [...digits];
                newDigits[index - 1] = '';
                setDigits(newDigits);
                inputRefs.current[index - 1]?.focus();
            } else {
                const newDigits = [...digits];
                newDigits[index] = '';
                setDigits(newDigits);
            }
        }
    };

    const handleResend = async () => {
        setCanResend(false);
        setCountdown(30);
        try {
            await authApi.sendCode(email);
        } catch (err) {
            setLocalError('Error al reenviar el código');
        }
    };

    const handleSubmit = () => {
        const code = digits.join('');
        if (code.length !== OTP_LENGTH) {
            setLocalError('Por favor ingresa un código de 6 dígitos');
            return;
        }
        setLocalError('');
        onSubmit(code);
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
                Ingresá el código que recibiste en{' '}
                <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{email}</Text>
            </Text>

            <View style={styles.otpContainer}>
                {digits.map((digit, index) => (
                    <RNTextInput
                        key={index}
                        ref={el => { inputRefs.current[index] = el; }}
                        style={[
                            styles.otpBox,
                            {
                                borderColor: digit
                                    ? theme.colors.primary
                                    : theme.colors.outline,
                                color: theme.colors.onSurface,
                            },
                        ]}
                        value={digit}
                        onChangeText={text => handleDigitChange(text, index)}
                        onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                        keyboardType="number-pad"
                        maxLength={OTP_LENGTH} // Allow paste
                        editable={!isLoading}
                        selectTextOnFocus
                        textContentType="oneTimeCode"
                    />
                ))}
            </View>

            {(localError || error) ? (
                <HelperText type="error" visible style={{ textAlign: 'center' }}>
                    {localError || error}
                </HelperText>
            ) : null}

            <View style={styles.resendContainer}>
                <TouchableOpacity onPress={canResend ? handleResend : undefined} disabled={!canResend}>
                    <Text style={{ color: canResend ? theme.colors.primary : theme.colors.onSurfaceDisabled ?? theme.colors.outline }}>
                        {canResend ? 'Reenviar código' : `Reenviar en ${countdown}s`}
                    </Text>
                </TouchableOpacity>
            </View>

            <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
            >
                Verificar
            </Button>

            <Button
                mode="outlined"
                onPress={onBack}
                disabled={isLoading}
                style={styles.backButton}
                icon="arrow-left"
            >
                Volver
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 8,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    otpBox: {
        width: 44,
        height: 52,
        borderWidth: 1.5,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '600',
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    button: {
        borderRadius: 6,
    },
    backButton: {
        borderRadius: 6,
        borderColor: 'rgba(255,255,255,0.2)',
    },
});
