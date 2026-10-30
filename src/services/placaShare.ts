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
 * - WhatsApp, X and Facebook take an image through their own share intent.
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

    if (!(await isInstalled(target))) return { outcome: 'missing' };

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

        const social =
            target === 'whatsapp'
                ? Social.Whatsapp
                : target === 'x'
                  ? Social.Twitter
                  : Social.Facebook;

        await Share.shareSingle({
            social,
            url: fileUri,
            type: 'image/png',
            filename: 'mi-resumen',
            message: MESSAGE,
        });
        return { outcome: 'shared' };
    } catch (error) {
        if (isCancellation(error)) return { outcome: 'cancelled' };
        // The app is there but would not take the handoff: the sheet still can.
        return systemSheet(fileUri);
    }
}
