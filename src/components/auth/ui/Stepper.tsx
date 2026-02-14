import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Step keys matching the web logic
export type StepKey = 'email' | 'code' | 'profile' | 'password' | 'existing-user';

interface StepperProps {
    currentStep: StepKey;
    steps: StepKey[];
    isLoading?: boolean;
}

const STEP_ICONS: Record<StepKey, string> = {
    email: 'email-outline',
    code: 'key-outline',
    profile: 'account-outline',
    password: 'lock-outline',
    'existing-user': 'login',
};

const STEP_LABELS: Record<StepKey, string> = {
    email: 'Correo',
    code: 'Verificar',
    profile: 'Perfil',
    password: 'Contraseña',
    'existing-user': 'Acceso',
};

export const Stepper = ({ currentStep, steps }: StepperProps) => {
    const theme = useTheme();
    const activeIndex = steps.indexOf(currentStep);

    return (
        <View style={styles.container}>
            {steps.map((step, index) => {
                const isActive = index === activeIndex;
                const isCompleted = index < activeIndex;
                const isLast = index === steps.length - 1;
                const isHighlighted = isActive || isCompleted;

                return (
                    <View key={step} style={styles.stepWrapper}>
                        <View style={styles.stepRow}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    {
                                        backgroundColor: isHighlighted
                                            ? theme.colors.primary
                                            : 'transparent',
                                        borderColor: isHighlighted
                                            ? theme.colors.primary
                                            : theme.colors.surfaceVariant,
                                    },
                                ]}
                            >
                                <Icon
                                    name={STEP_ICONS[step]}
                                    size={18}
                                    color={isHighlighted ? '#FFFFFF' : theme.colors.onSurfaceDisabled ?? '#666'}
                                />
                            </View>
                            {!isLast && (
                                <View
                                    style={[
                                        styles.connector,
                                        {
                                            backgroundColor: isCompleted
                                                ? theme.colors.primary
                                                : theme.colors.surfaceVariant,
                                        },
                                    ]}
                                />
                            )}
                        </View>
                        <Text
                            style={[
                                styles.label,
                                {
                                    color: isHighlighted
                                        ? theme.colors.primary
                                        : theme.colors.onSurfaceDisabled ?? '#666',
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {STEP_LABELS[step]}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    stepWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    connector: {
        flex: 1,
        height: 3,
        borderRadius: 1.5,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },
});
