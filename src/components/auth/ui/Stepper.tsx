import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';

// Step keys matching the web logic
export type StepKey = 'email' | 'code' | 'profile' | 'password' | 'existing-user';

interface StepperProps {
    currentStep: StepKey;
    steps: StepKey[];
    isLoading?: boolean;
}

const STEP_LABELS: Record<StepKey, string> = {
    email: 'Correo',
    code: 'Verificar',
    profile: 'Perfil',
    password: 'Contraseña',
    'existing-user': 'Acceso',
};

/**
 * Four bars and a line of text, in place of circles with icons, labels and
 * connectors.
 *
 * That one needs width a 390px screen does not have — the labels wrapped and
 * the circles crowded — and it says exactly what this says: where you are and
 * how much is left. The bars are decoration; the sentence is the accessible
 * version, so a screen reader gets one short phrase instead of five icons.
 */
export const Stepper = ({ currentStep, steps }: StepperProps) => {
    const theme = useTheme();
    const activeIndex = Math.max(0, steps.indexOf(currentStep));

    return (
        <View style={styles.container}>
            <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {steps.map((step, index) => (
                    <View
                        key={step}
                        style={[
                            styles.bar,
                            {
                                backgroundColor:
                                    index <= activeIndex ? theme.colors.primary : '#1E293B',
                            },
                        ]}
                    />
                ))}
            </View>
            <Text style={styles.label} accessibilityRole="text">
                Paso {activeIndex + 1} de {steps.length} ·{' '}
                {STEP_LABELS[steps[activeIndex] ?? steps[0]]}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 8,
        paddingHorizontal: 4,
        paddingBottom: 4,
    },
    bars: {
        flexDirection: 'row',
        gap: 6,
    },
    bar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    label: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        lineHeight: 16,
        color: '#94A3B8',
    },
});
