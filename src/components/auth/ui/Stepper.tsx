import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

// Step keys matching the web logic
export type StepKey = 'email' | 'code' | 'profile' | 'password' | 'existing-user';

interface StepperProps {
    currentStep: StepKey;
    steps: StepKey[];
    /** The sign-up finished: the last quarter belongs to the password being accepted. */
    complete?: boolean;
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
 * One bar that fills, in place of circles with icons, labels and connectors.
 *
 * That one needed width a 390px screen does not have — the labels wrapped and
 * the circles crowded. The line of text that replaced them ("Paso 2 de 4 ·
 * Verificar") went too: nobody reads it as anything but paperwork, and the
 * header right above it already says which step this is. What the bar adds is
 * the part the header cannot show, which is how much is left. The count is
 * announced rather than drawn, so a screen reader still gets the sentence.
 *
 * It measures the steps behind you, not the one you are standing on: the
 * password screen is three quarters of the way, and `complete` closes it —
 * the sign-up is finished when the password is accepted, not when the form
 * is shown.
 */
export const Stepper = ({ currentStep, steps, complete = false }: StepperProps) => {
    const theme = useTheme();
    const activeIndex = Math.max(0, steps.indexOf(currentStep));
    const done = complete ? steps.length : activeIndex;
    const value = steps.length ? done / steps.length : 0;

    const progress = useRef(new Animated.Value(value)).current;
    useEffect(() => {
        Animated.timing(progress, {
            toValue: value,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            // Width is a layout property; the native driver cannot carry it.
            useNativeDriver: false,
        }).start();
    }, [value, progress]);

    return (
        <View
            style={styles.container}
            accessibilityRole="progressbar"
            accessibilityValue={{
                min: 0,
                max: steps.length,
                now: done,
                text: complete
                    ? 'Listo'
                    : `Paso ${activeIndex + 1} de ${steps.length}: ${
                          STEP_LABELS[steps[activeIndex] ?? steps[0]]
                      }`,
            }}
        >
            <View style={styles.track}>
                <Animated.View
                    style={[
                        styles.fill,
                        {
                            backgroundColor: theme.colors.primary,
                            width: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        },
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 4,
        paddingBottom: 4,
    },
    track: {
        height: 4,
        borderRadius: 2,
        backgroundColor: '#1E293B',
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 2,
    },
});
