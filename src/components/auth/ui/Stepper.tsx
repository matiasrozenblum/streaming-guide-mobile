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
                        <View style={styles.iconContainer}>
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
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 36, // Match iconCircle height
        marginBottom: 4,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2, // Ensure icon stays on top of connector
        backgroundColor: 'transparent', // Will be overridden dynamically
    },
    connector: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '100%', // Spans from center of current to center of next (approx)
        height: 2, // Thinner line
        marginTop: -1, // Center vertically
        zIndex: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
});
