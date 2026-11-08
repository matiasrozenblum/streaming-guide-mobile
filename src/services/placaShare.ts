import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as MediaLibrary from 'expo-media-library';
import Share, { Social } from 'react-native-share';

export type ShareTarget =
    | 'instagram'
    | 'whatsapp'
    | 'x'
    | 'facebook'
    | 'download';

export type ShareOutcome =
    /** The target app took it. */
    | 'shared'
    /** It went to the camera roll, which was the ask. */
    | 'saved'
    /** The person backed out. Not a failure, and nothing should be said. */
    | 'cancelled'
    /** The app is not on this phone. */
    | 'missing'
    /** Handed to the system sheet because the direct route was unavailable. */
    | 'fallback'
    | 'error';

export interface ShareResult {
    outcome: ShareOutcome;
    /** Only set on 'error', for the log — never shown as-is. */
    detail?: string;
}

const FACEBOOK_APP_ID: string = Constants.expoConfig?.extra?.facebookAppId ?? '';

const MESSAGE = 'Mi resumen en La Guía del Streaming';

/**
 * Where a shared link lands: the section itself, which answers somebody
 * without an account with what it is and an invitation to open one.
 */
const SHARE_URL: string = `${
    Constants.expoConfig?.extra?.webUrl ?? 'https://laguiadelstreaming.com'
}/mi-resumen`;

/** How to tell whether a target app is on the phone, per platform. */
const PRESENCE: Record<
    Exclude<ShareTarget, 'download'>,
    { scheme: string; androidPackage: string }
> = {
    instagram: { scheme: 'instagram://', androidPackage: 'com.instagram.android' },
    whatsapp: { scheme: 'whatsapp://', androidPackage: 'com.whatsapp' },
    x: { scheme: 'twitter://', androidPackage: 'com.twitter.android' },
    facebook: { scheme: 'fb://', androidPackage: 'com.facebook.katana' },
};

async function isInstalled(target: Exclude<ShareTarget, 'download'>): Promise<boolean> {
    const { scheme, androidPackage } = PRESENCE[target];
    try {
        if (Platform.OS === 'android') {
            const { isInstalled: installed } = await Share.isPackageInstalled(androidPackage);
            return installed;
        }
        // iOS only answers this for schemes declared in LSApplicationQueriesSchemes.
        return await Linking.canOpenURL(scheme);
    } catch {
        return false;
    }
}

/** react-native-share rejects rather than resolves when the sheet is dismissed. */
function isCancellation(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /did not share|cancell?ed|dismiss/i.test(message);
}

async function saveToCameraRoll(fileUri: string): Promise<ShareResult> {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) return { outcome: 'error', detail: 'permission denied' };
    await MediaLibrary.saveToLibraryAsync(fileUri);
    return { outcome: 'saved' };
}

/**
 * Where each network opens its composer, already filled in.
 *
 * WhatsApp has a scheme of its own and takes the text. X and Facebook are
 * reached by the https links their apps claim, which is what works after the
 * rebrand left `twitter://post` unreliable. Facebook drops any text we pass,
 * by its own policy, so it gets the link alone.
 */
function composerUrl(target: 'whatsapp' | 'x' | 'facebook'): string {
    const text = encodeURIComponent(`${MESSAGE} ${SHARE_URL}`);
    if (target === 'whatsapp') return `whatsapp://send?text=${text}`;
    if (target === 'x') {
        return `https://x.com/intent/post?text=${encodeURIComponent(
            MESSAGE,
        )}&url=${encodeURIComponent(SHARE_URL)}`;
    }
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        SHARE_URL,
    )}`;
}

/** Last resort: the OS sheet, which can always take a PNG somewhere. */
async function systemSheet(fileUri: string): Promise<ShareResult> {
    try {
        await Share.open({
            url: fileUri,
            type: 'image/png',
            message: MESSAGE,
            failOnCancel: false,
        });
        return { outcome: 'fallback' };
    } catch (error) {
        if (isCancellation(error)) return { outcome: 'cancelled' };
        return { outcome: 'error', detail: String(error) };
    }
}

/**
 * Hand a placa to one app.
 *
 * Each network is reached the most direct way it allows, which is not the same
 * for all of them:
 *
 * - Instagram takes a Stories handoff, but only against a registered Facebook
 *   app id. Without one it is the system sheet or nothing.
 * - WhatsApp, X and Facebook take a link and a line of text, and open on their
 *   own composer. They do not take a file: an image can only reach them
 *   through the system sheet, which is why handing them the PNG failed and
 *   dropped everyone into that sheet. This is the same trade every app makes
 *   — the one that shares a song to WhatsApp is sharing its url, not a
 *   picture of it. The placa stays reachable through Instagram and Descargar.
 */
export async function sharePlaca(
    target: ShareTarget,
    fileUri: string,
): Promise<ShareResult> {
    if (target === 'download') {
        try {
            return await saveToCameraRoll(fileUri);
        } catch (error) {
            return { outcome: 'error', detail: String(error) };
        }
    }

    // Only WhatsApp is reached by a scheme of its own, so it is the only one
    // whose absence is worth checking. X and Facebook are opened by https
    // links their apps claim: with the app installed it opens, without it the
    // browser does — and either way something happens, which beats the dead
    // end this check used to produce for X, whose `twitter://` scheme iOS
    // never answered for us.
    if (target === 'whatsapp' && !(await isInstalled(target))) {
        return { outcome: 'missing' };
    }

    try {
        if (target === 'instagram') {
            if (!FACEBOOK_APP_ID) return systemSheet(fileUri);
            await Share.shareSingle({
                social: Social.InstagramStories,
                appId: FACEBOOK_APP_ID,
                backgroundImage: fileUri,
                backgroundBottomColor: '#0F172A',
                backgroundTopColor: '#0F172A',
            });
            return { outcome: 'shared' };
        }

        await Linking.openURL(composerUrl(target));
        return { outcome: 'shared' };
    } catch (error) {
        if (isCancellation(error)) return { outcome: 'cancelled' };
        // The app is there but would not take the handoff: the sheet still can.
        return systemSheet(fileUri);
    }
}
