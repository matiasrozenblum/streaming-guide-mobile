import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Image,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { getTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { navigate } from '../../navigation/NavigationService';
import { buildLegalConsentEntry, hasAcceptedCurrentLegal } from '../../constants/legal';

const WEB_URL: string =
    Constants.expoConfig?.extra?.webUrl ?? 'https://laguiadelstreaming.com';

/**
 * The placa fan at the top of the sheet, straight from the Paper artboard.
 *
 * The artboard rotates each card about its top-left corner, which React Native
 * cannot do — `transform: rotate` always turns a view about its centre. These
 * positions are the design's coordinates re-expressed for that centre pivot
 * (the top-left corner the designer placed, pushed by the offset the rotation
 * introduces), so the arrangement lands pixel for pixel where it was drawn.
 */
const STAGE_WIDTH = 390;
const STAGE_HEIGHT = 230;
const CARD_WIDTH = 124;
const CARD_HEIGHT = 220;

const PLACAS = [
    { src: require('../../../assets/recap-intro/left.jpg'), left: 78, top: 25, rotate: '-9deg', front: false },
    { src: require('../../../assets/recap-intro/right.jpg'), left: 186, top: 44, rotate: '9deg', front: false },
    // Last so it paints over the two tilted ones behind it.
    { src: require('../../../assets/recap-intro/center.jpg'), left: 133, top: 20, rotate: '0deg', front: true },
];

function PlacaStage() {
    return (
        <View style={styles.stage} pointerEvents="none">
            {/* A pool of light under the placas, so the fan sits on something
                instead of floating on a flat panel. No radial gradients in RN,
                hence the SVG. */}
            <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                    <RadialGradient id="recapIntroGlow" cx="50%" cy="100%" rx="70%" ry="80%">
                        <Stop offset="0" stopColor="#3B82F6" stopOpacity={0.35} />
                        <Stop offset="1" stopColor="#3B82F6" stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#recapIntroGlow)" />
            </Svg>

            <View style={styles.stageInner}>
                {PLACAS.map((placa, index) => (
                    <View
                        key={index}
                        style={[
                            styles.placa,
                            {
                                left: placa.left,
                                top: placa.top,
                                transform: [{ rotate: placa.rotate }],
                            },
                            placa.front ? styles.placaFront : styles.placaBack,
                        ]}
                    >
                        <Image source={placa.src} style={styles.placaImage} resizeMode="cover" />
                    </View>
                ))}
            </View>
        </View>
    );
}

interface ViewProps {
    visible: boolean;
    onContinue: () => void;
    onSignOut: () => void;
}

/**
 * The notice itself, with no session or network concerns — kept separate so the
 * layout can be rendered and reviewed on its own.
 *
 * A tray rather than a centred card: it rises from the bottom edge, where the
 * thumb already is, and uses the full width of the screen instead of wasting it
 * on margins the way a floating dialog would.
 */
export function RecapIntroSheet({ visible, onContinue, onSignOut }: ViewProps) {
    const theme = getTheme('dark');
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    // One line, the way it was drawn. The headline takes just under 13px of
    // width for every px of type, and the room it gets depends on the phone, so
    // the size comes off the screen rather than off a constant — 27px is the
    // artboard's size and the ceiling.
    const titleSize = Math.min(27, (width - 56) / 13.6);

    // `animationType="slide"` on Modal slides the backdrop up along with the
    // sheet, which reads as the whole screen sliding rather than a tray coming
    // up. One value drives both halves instead: the veil fades, the tray moves.
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        progress.setValue(0);
        Animated.timing(progress, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [visible, progress]);

    const openLegal = useCallback(
        (path: string) => {
            WebBrowser.openBrowserAsync(`${WEB_URL}${path}`, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                controlsColor: theme.colors.primary,
            }).catch(() => {
                // Nothing useful to say: the notice stays up and they can retry.
            });
        },
        [theme.colors.primary],
    );

    const year = new Date().getFullYear();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            // Android's back button must not be a way past this.
            onRequestClose={() => {}}
        >
            <View style={styles.root}>
                <Animated.View style={[styles.backdrop, { opacity: progress }]} />

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            paddingBottom: Math.max(34, insets.bottom + 16),
                            transform: [
                                {
                                    translateY: progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [600, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['#1B2740', '#131C30']}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* No grab handle on purpose: this sheet cannot be
                        dragged away — the only ways past it are accepting or
                        signing out — and a handle would promise a gesture that
                        does not exist. */}
                    <PlacaStage />

                    <View style={styles.copyBlock}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>NUEVO</Text>
                        </View>

                        <Text
                            style={[
                                styles.title,
                                {
                                    fontSize: titleSize,
                                    lineHeight: Math.round(titleSize * 1.05),
                                    letterSpacing: titleSize * -0.03,
                                },
                            ]}
                        >
                            ¡Llegó tu resumen a La Guía!
                        </Text>

                        <Text style={styles.body}>
                            Mirá el ranking de los programas y canales que más viste en la
                            semana, con diseños listos para compartir en redes.
                        </Text>

                        <Text style={styles.highlight}>
                            A fin de año tendrás tu resumen de {year} también.
                        </Text>
                    </View>

                    <View style={styles.actionBlock}>
                        <Pressable
                            onPress={onContinue}
                            accessibilityRole="button"
                            accessibilityLabel="Continuar y ver mi resumen"
                            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
                        >
                            <LinearGradient
                                colors={['#3B82F6', '#2563EB']}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={styles.ctaGradient}
                            >
                                <Text style={styles.ctaLabel}>Continuar y ver mi resumen</Text>
                            </LinearGradient>
                        </Pressable>

                        <Text style={styles.finePrint}>
                            Al continuar confirmás que sos mayor de 18 años y aceptás nuestros{' '}
                            <Text
                                style={styles.finePrintLink}
                                onPress={() => openLegal('/terminos-y-condiciones')}
                            >
                                Términos y Condiciones
                            </Text>{' '}
                            y la{' '}
                            <Text
                                style={styles.finePrintLink}
                                onPress={() => openLegal('/legal/politica-de-privacidad')}
                            >
                                Política de Privacidad
                            </Text>
                            . O podés{' '}
                            <Text style={styles.finePrintAction} onPress={onSignOut}>
                                cerrar sesión
                            </Text>
                            .
                        </Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

/**
 * Blocking notice shown once per account, announcing the recap feature and
 * taking acceptance of the current terms, privacy policy and the 18+
 * declaration in one step. The website shows the same notice against the same
 * backend record, so accepting on either surface settles both.
 *
 * It cannot be dismissed: the only ways past it are accepting or signing out.
 *
 * Accepting moves on at once and records the acceptance in the background.
 * Nothing is lost if that write fails — the acceptance simply is not stored, so
 * the notice comes back next time, which is both the safe side legally and the
 * one that cannot leave anybody stuck on a dead sheet.
 */
export function RecapIntroGate() {
    const { isAuthenticated, isLoading, logout } = useAuth();
    const [visible, setVisible] = useState(false);

    /**
     * Set the moment the user accepts, before the write has landed. Without it,
     * a re-render while the POST is still in flight would re-query the backend,
     * read "not accepted" and put the sheet straight back on screen.
     */
    const acceptedRef = useRef(false);

    useEffect(() => {
        // Wait until auth state resolves, so the sheet never flashes over a
        // screen that is about to turn out to be logged out.
        if (isLoading) return;

        if (!isAuthenticated) {
            // A different account may sign in next, and they have their own
            // acceptance to give.
            acceptedRef.current = false;
            setVisible(false);
            return;
        }

        if (acceptedRef.current) return;

        let cancelled = false;

        api.get('/users/me/seen-features')
            .then((res) => {
                if (cancelled) return;
                const seen: string[] = Array.isArray(res.data) ? res.data : [];
                setVisible(!hasAcceptedCurrentLegal(seen));
            })
            .catch(() => {
                // We cannot tell whether they already accepted. Staying quiet is
                // the right failure mode: a blocking sheet on a network blip
                // would lock people out of an app whose terms they may have
                // accepted long ago.
                if (!cancelled) setVisible(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, isLoading]);

    const accept = useCallback(() => {
        acceptedRef.current = true;
        setVisible(false);

        api.post('/users/me/seen-features', { feature: buildLegalConsentEntry() }).catch(
            () => {
                // Nothing to tell the user: the notice will simply reappear later.
            },
        );

        navigate('MainTabs', { screen: 'Mi resumen' });
    }, []);

    const signOut = useCallback(() => {
        setVisible(false);
        logout().catch(() => {
            // AuthContext tears the session down on every path, including this
            // one; there is nothing left for the sheet to do about it.
        });
    }, [logout]);

    return <RecapIntroSheet visible={visible} onContinue={accept} onSignOut={signOut} />;
}

const theme = getTheme('dark');

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(7, 11, 20, 0.72)',
    },
    sheet: {
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderTopWidth: 1,
        borderTopColor: '#334155',
        backgroundColor: '#131C30',
        overflow: 'hidden',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 24,
    },
    stage: {
        width: '100%',
        height: STAGE_HEIGHT,
        overflow: 'hidden',
    },
    stageInner: {
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        alignSelf: 'center',
    },
    placa: {
        position: 'absolute',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
    },
    placaBack: {
        borderWidth: 1,
        borderColor: '#475569',
    },
    placaFront: {
        borderWidth: 2,
        borderColor: '#3B82F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    placaImage: {
        width: '100%',
        height: '100%',
    },
    copyBlock: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 22,
        gap: 12,
    },
    badge: {
        backgroundColor: 'rgba(59, 130, 246, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(96, 165, 250, 0.5)',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    badgeText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 1.32,
        color: '#93C5FD',
    },
    title: {
        fontFamily: 'Outfit_800ExtraBold',
        color: '#F1F5F9',
        textAlign: 'center',
    },
    body: {
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        lineHeight: 23,
        color: '#CBD5E1',
        textAlign: 'center',
    },
    highlight: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        lineHeight: 16,
        color: '#93C5FD',
        textAlign: 'center',
    },
    actionBlock: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 22,
        gap: 14,
    },
    cta: {
        width: '100%',
        borderRadius: 999,
        // iOS draws the glow from the view's own shadow; Android needs the
        // elevation, which it paints as a plain drop shadow.
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: Platform.OS === 'android' ? 6 : 0,
    },
    ctaPressed: {
        opacity: 0.88,
    },
    ctaGradient: {
        height: 54,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaLabel: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
        lineHeight: 20,
        color: '#FFFFFF',
    },
    finePrint: {
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        lineHeight: 17,
        color: '#94A3B8',
        textAlign: 'center',
    },
    finePrintLink: {
        color: theme.colors.primary,
        textDecorationLine: 'underline',
    },
    finePrintAction: {
        color: '#94A3B8',
        textDecorationLine: 'underline',
    },
});
