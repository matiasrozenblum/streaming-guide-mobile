import { Linking, Platform } from 'react-native';
import { File } from 'expo-file-system';
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
 * Both are reached by the https links their apps claim, which is what works
 * after the rebrand left `twitter://post` unreliable. Facebook drops any text
 * we pass, by its own policy, so it gets the link alone.
 */
function composerUrl(target: 'x' | 'facebook'): string {
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
 * - WhatsApp takes the image itself, through the document-interaction route
 *   it registers for (`net.whatsapp.image`). It is the file or a line of
 *   text, never both: the url scheme carries text and this one carries the
 *   file, and there is no third door that carries the two.
 * - X and Facebook take a link and a line of text, and open on their own
 *   composer. Neither accepts an image by any public route — the one way to
 *   put a picture in front of them is the system sheet, which is what every
 *   app that shares to them ends up doing.
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

    // Only WhatsApp needs to be there for its route to work. X and Facebook
    // are opened by https links their apps claim: with the app installed it
    // opens, without it the browser does — either way something happens,
    // which beats the dead end this check used to produce for X, whose
    // `twitter://` scheme iOS never answered for us.
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

        if (target === 'whatsapp') {
            /**
             * The bytes, not a path to them.
             *
             * The handoff reads whatever `url` points at and rejects without
             * saying why when it comes back empty — which is the likeliest
             * reason this ended up in the system sheet, since the one check
             * that could also reject (is WhatsApp there?) had already passed
             * ours a line earlier. Reading the file here removes that whole
             * class of failure: a `data:` url is handed over as-is, and the
             * module takes one as readily as a path.
             *
             * `message` rides along even though WhatsApp never shows it: the
             * module's own guard returns early when it is missing, without
             * resolving or rejecting, and the promise would hang forever.
             */
            const base64 = await new File(fileUri).base64();
            await Share.shareSingle({
                social: Social.Whatsapp,
                url: `data:image/png;base64,${base64}`,
                type: 'image/png',
                message: MESSAGE,
            });
            return { outcome: 'shared' };
        }

        await Linking.openURL(composerUrl(target));
        return { outcome: 'shared' };
    } catch (error) {
        if (isCancellation(error)) return { outcome: 'cancelled' };
        /**
         * The app is there but would not take the handoff: the sheet still
         * can. Logged because that refusal is the interesting part — this is
         * how WhatsApp ended up opening the system sheet, and the reason was
         * never written down anywhere.
         */
        console.warn('[Compartir] la entrega directa falló', target, error);
        return { ...(await systemSheet(fileUri)), detail: String(error) };
    }
}
