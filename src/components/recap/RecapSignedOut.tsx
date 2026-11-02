import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { getTheme } from '../../theme';
import { useLoginModal } from '../../context/LoginModalContext';

/**
 * The three placas, fanned, from the same artboard the welcome notice uses.
 * Rotation is about the centre here, which is all a decorative fan needs.
 */
const PLACAS = [
    { src: require('../../../assets/recap-intro/left.jpg'), rotate: '-8deg', lift: 14 },
    { src: require('../../../assets/recap-intro/center.jpg'), rotate: '0deg', lift: 0 },
    { src: require('../../../assets/recap-intro/right.jpg'), rotate: '8deg', lift: 14 },
];

/**
 * What the recap tab shows to somebody who is not signed in.
 *
 * The tab used to be hidden from them, which kept the best reason to open an
 * account out of sight of everyone who has not opened one. The pitch stands on
 * its own and the button hands over to the sign-in flow the app already has —
 * on a phone that flow is a modal, so there is nothing to inline the way the
 * website does with its right-hand column.
 */
export const RecapSignedOut = () => {
    const theme = getTheme('dark');
    const { show: showLogin } = useLoginModal();
    const { width } = useWindowDimensions();

    // Three across the screen, with their gaps, and never wider than drawn.
    const placaWidth = Math.min(112, (width - 40 - 16) / 3);

    return (
        <View style={styles.root}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                Tu resumen, en placas para compartir
            </Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                Los programas y streamers que más viste en la semana y en el mes, con
                el diseño listo para subir a tus historias.
            </Text>

            <View style={styles.fan} pointerEvents="none">
                {PLACAS.map((placa, index) => (
                    <View
                        key={index}
                        style={{
                            width: placaWidth,
                            height: (placaWidth * 16) / 9,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#475569',
                            overflow: 'hidden',
                            marginTop: placa.lift,
                            transform: [{ rotate: placa.rotate }],
                        }}
                    >
                        <Image source={placa.src} style={styles.placaImage} resizeMode="cover" />
                    </View>
                ))}
            </View>

            <Pressable
                onPress={() => showLogin()}
                accessibilityRole="button"
                style={({ pressed }) => [
                    styles.cta,
                    { backgroundColor: theme.colors.primary },
                    pressed && styles.ctaPressed,
                ]}
            >
                <Text style={styles.ctaLabel}>Crear cuenta o iniciar sesión</Text>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    title: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 24,
        lineHeight: 28,
        letterSpacing: -0.72,
        textAlign: 'center',
    },
    body: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
    },
    fan: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: 8,
    },
    placaImage: {
        width: '100%',
        height: '100%',
    },
    cta: {
        width: '100%',
        height: 48,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaPressed: {
        opacity: 0.88,
    },
    ctaLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15,
        lineHeight: 18,
        color: '#FFFFFF',
    },
});
