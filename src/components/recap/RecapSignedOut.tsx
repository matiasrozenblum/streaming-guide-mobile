import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EmailStep } from '../auth/steps/EmailStep';
import { useLoginModal } from '../../context/LoginModalContext';
import { getTheme } from '../../theme';

/**
 * The fan, from the artboard's 390px width, as fractions of whatever width the
 * phone has. Two placas and not three: on 390 a third is a sliver.
 *
 * React Native rotates about a view's centre and the artboard rotates the left
 * placa about its top-left corner, so its position is the design's coordinate
 * re-expressed for that pivot.
 */
const DESIGN = 390;
const FAN_HEIGHT = 176;

const PLACAS = [
    {
        src: require('../../../assets/recap-intro/left.jpg'),
        left: 77,
        top: 12,
        w: 128,
        h: 228,
        radius: 16,
        rotate: '-8deg',
    },
    {
        src: require('../../../assets/recap-intro/center.jpg'),
        left: 176,
        top: 0,
        w: 150,
        h: 267,
        radius: 18,
        rotate: '0deg',
    },
];

/**
 * What the recap tab shows to somebody who is not signed in.
 *
 * The tab used to be hidden from them, which kept the best reason to open an
 * account out of sight of everyone who had not opened one. The argument takes
 * the screen and the form is a panel on the bottom edge; the moment it needs
 * more than an e-mail, the sign-in opens as a panel of its own, hinged to the
 * same edge, so it reads as this one growing.
 *
 * The panel renders the real `EmailStep` rather than its own field and
 * buttons: the account flow is the one thing in this app that must not exist
 * twice, so what the reader types here is handed straight to it.
 */
export const RecapSignedOut = () => {
    const theme = getTheme('dark');
    const { show: showLogin } = useLoginModal();
    const { width } = useWindowDimensions();

    const scale = Math.min(width, DESIGN) / DESIGN;
    const u = (n: number) => n * scale;

    return (
        <View style={styles.root}>
            <View style={styles.pitch}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                    Tu resumen, en placas para compartir
                </Text>
                <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                    Los programas y streamers que más viste, listos para subir a tus
                    historias.
                </Text>

                <View
                    style={[styles.fan, { width: u(DESIGN), height: u(FAN_HEIGHT) }]}
                    pointerEvents="none"
                >
                    {PLACAS.map((placa, index) => (
                        <View
                            key={index}
                            style={{
                                position: 'absolute',
                                left: u(placa.left),
                                top: u(placa.top),
                                width: u(placa.w),
                                height: u(placa.h),
                                borderRadius: u(placa.radius),
                                borderWidth: 2,
                                borderColor: '#334155',
                                overflow: 'hidden',
                                transform: [{ rotate: placa.rotate }],
                            }}
                        >
                            <Image source={placa.src} style={styles.placaImage} resizeMode="cover" />
                        </View>
                    ))}
                </View>

                {/* Why an account at all, which is the question a wall provokes
                    and nobody was answering. */}
                <View style={styles.callout}>
                    <MaterialIcons name="lock-outline" size={20} color="#60A5FA" />
                    <Text style={styles.calloutText}>
                        <Text style={styles.calloutLead}>¿Por qué una cuenta?</Text> Para
                        armar tu resumen necesitamos saber qué mirás: con tu usuario vamos
                        sumando los programas que viste.
                    </Text>
                </View>
            </View>

            <View style={styles.panel}>
                <Text style={[styles.panelTitle, { color: theme.colors.textPrimary }]}>
                    ¡Bienvenid@ a La Guía!
                </Text>
                <EmailStep
                    isLoading={false}
                    onSubmit={(email) => showLogin(undefined, { initialEmail: email, panel: true })}
                    onGoogleLogin={() => showLogin(undefined, { social: 'google', panel: true })}
                    onAppleLogin={() => showLogin(undefined, { social: 'apple', panel: true })}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'space-between',
    },
    /**
     * Takes whatever the panel leaves and clips what does not fit — the fan is
     * a cropped stage anyway. Letting it size itself pushed the panel past the
     * bottom of the screen on anything shorter than the artboard.
     */
    pitch: {
        flex: 1,
        overflow: 'hidden',
        alignItems: 'center',
        paddingTop: 14,
    },
    title: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 27,
        lineHeight: 28,
        letterSpacing: -0.81,
        textAlign: 'center',
        maxWidth: 340,
        paddingHorizontal: 24,
    },
    body: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        maxWidth: 320,
        paddingHorizontal: 24,
        marginTop: 8,
    },
    fan: {
        marginTop: 14,
        overflow: 'hidden',
    },
    placaImage: {
        width: '100%',
        height: '100%',
    },
    callout: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 14,
        marginHorizontal: 20,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#13223E',
        borderWidth: 1,
        borderColor: '#1A325D',
    },
    calloutText: {
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: 12.5,
        lineHeight: 18,
        color: '#E2E8F0',
    },
    calloutLead: {
        fontFamily: 'Inter_600SemiBold',
        color: '#F1F5F9',
    },
    panel: {
        backgroundColor: '#141C30',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    panelTitle: {
        fontFamily: 'Inter_500Medium',
        fontSize: 17,
        lineHeight: 24,
        marginBottom: 6,
    },
});
