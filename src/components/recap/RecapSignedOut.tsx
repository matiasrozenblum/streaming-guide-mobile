import React from 'react';
import {
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
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
/**
 * Where the lowest placa actually ends, rotation included: the left one turns
 * about its centre, so its corner reaches 248, and the upright one reaches its
 * full 267. Past this the stage would be growing empty background, so it is
 * where the fan stops taking room it is offered.
 */
const FAN_FULL = 268;
/**
 * The artboard is 390 wide and the fan was pinned to that, so on a wider phone
 * it stayed 390 and sat in the middle of unused width. It scales with the
 * screen now, up to a point: past a large phone the placas would be the whole
 * screen and the argument above them an afterthought.
 */
const MAX_FAN_WIDTH = 480;

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

    /**
     * While the keyboard is up the argument stands down. Shrinking only the
     * fan is not enough — the title, the copy and the card are some 190px that
     * do not give — and what is left over the keyboard has to hold the whole
     * form, button included. It is the same move the website makes when the
     * form takes over the screen.
     */
    const [keyboardUp, setKeyboardUp] = React.useState(false);
    React.useEffect(() => {
        const show = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardUp(true),
        );
        const hide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardUp(false),
        );
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);
    const { width } = useWindowDimensions();

    const scale = Math.min(width, MAX_FAN_WIDTH) / DESIGN;
    const u = (n: number) => n * scale;

    return (
        /**
         * The panel is hinged to the bottom edge, which is exactly where the
         * keyboard comes up, so without this the field somebody just tapped is
         * the first thing to disappear. Android asks for `adjustResize` in the
         * manifest, but the app draws edge to edge and that stops the window
         * from resizing, so both platforms need this and not just iOS.
         *
         * What gives is the pitch: it is `flex: 1` and clips, so the fan loses
         * height while the panel keeps all of its own.
         */
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.pitch, keyboardUp && styles.pitchHidden]}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                    Tu resumen, en placas para compartir
                </Text>
                <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                    Los programas y streamers que más viste, listos para subir a tus
                    historias.
                </Text>

                <View
                    style={[
                        styles.fan,
                        { width: u(DESIGN), height: u(FAN_HEIGHT), maxHeight: u(FAN_FULL) },
                    ]}
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

            <View style={[styles.panel, keyboardUp && styles.panelExpanded]}>
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
        </KeyboardAvoidingView>
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
    /**
     * With the argument gone there is nothing left for `space-between` to push
     * against, so the panel takes the room instead of leaving a hole where the
     * pitch was. Its content still starts at the top, so the form reads as the
     * panel having grown into the screen — the same move the website makes.
     * Anchoring it to the bottom instead put it back under the keyboard.
     */
    panelExpanded: {
        flex: 1,
    },
    pitchHidden: {
        display: 'none',
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
        /**
         * The fan is what the leftover height goes to, in both directions. It
         * is a cropped stage, so shrinking only crops a little more — and the
         * paragraph under it is text, where half a sentence looks broken. The
         * other way matters where the panel is short: Android offers one
         * social button against the two on iOS, and without this the 50-odd
         * pixels that buys pile up as a hole between the card and the panel
         * instead of showing more of the placas.
         */
        flexShrink: 1,
        flexGrow: 1,
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
        // The artboard leaves the panel detached from the card above it.
        marginTop: 16,
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
