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
        /**
         * La placa sola, sin texto al lado.
         *
         * Mandar los dos arma un paquete de dos piezas, y no todas las apps
         * toman las dos: algunas se quedan con el texto y sueltan la imagen,
         * que es justo lo que no queremos. Con una sola pieza iOS resuelve el
         * `.png` a `public.png` y ofrece las apps que reciben imágenes.
         * El texto tampoco hace falta: la placa ya lleva impreso de dónde
         * sale y la dirección del sitio.
         */
        await Share.open({
            url: fileUri,
            type: 'image/png',
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
 * - WhatsApp gets the system sheet. It registers a route for files of its
 *   own, and that route works — but Apple turned the "Open in…" menu it used
 *   into the share sheet, so it lands there anyway. See below.
 * - Facebook takes the placa as a story, the same handoff Instagram takes
 *   and against the same app id. Its feed would need Facebook's own SDK, and
 *   the sharer link only ever carries a url.
 * - X takes a link and a line of text and opens on its composer. It has no
 *   route for an image: its own module only ever builds `twitter://post` or
 *   the web intent, both of them text and url. The system sheet is the only
 *   way a picture reaches it.
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

        /**
         * WhatsApp sale por el menú del sistema, y no por una vuelta más
         * larga que termina en el mismo lugar.
         *
         * Tiene una vía propia para archivos —el UTI `net.whatsapp.image`,
         * por document interaction— y la usábamos. Funcionaba: el log del
         * dispositivo muestra la entrega aceptada, sin un solo rechazo. Lo
         * que pasa es que Apple reemplazó el viejo menú "Abrir en…" por el
         * menú de compartir, así que ese camino desemboca ahí de todos modos,
         * después de leer el archivo y copiarlo a un temporal para nada.
         *
         * No queda otra vía: el esquema `whatsapp://` lleva texto y no
         * archivos. Entregar una imagen a WhatsApp en iOS es el menú, y
         * hacerlo explícito ahorra el rodeo y deja escrito por qué.
         */
        if (target === 'whatsapp') return systemSheet(fileUri);

        if (target === 'facebook' && FACEBOOK_APP_ID) {
            /**
             * A Facebook story, the same handoff Instagram takes and against
             * the same app id. It is the one route that carries the placa
             * itself: the sharer link carries a url and the feed would need
             * Facebook's SDK. Stories is where this belongs anyway — it is
             * what the placa is shaped like.
             */
            await Share.shareSingle({
                social: Social.FacebookStories,
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
        /**
         * The app is there but would not take the handoff: the sheet still
         * can. Logged because that refusal is the interesting part — this is
         * how WhatsApp ended up opening the system sheet, and the reason was
         * never written down anywhere.
         */
        console.warn('[Compartir] la entrega directa falló', target, error);
        return systemSheet(fileUri);
    }
}
