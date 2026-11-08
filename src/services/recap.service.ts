import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import api from './api';
import { PlacaKind, Recap, RecapPeriod } from '../types/recap';

const WEB_URL: string =
    Constants.expoConfig?.extra?.webUrl ?? 'https://laguiadelstreaming.com';

/** Where the downloaded placas live between launches. */
const PLACAS_DIR = 'placas';

function placasDirectory(): Directory {
    const directory = new Directory(Paths.cache, PLACAS_DIR);
    if (!directory.exists) directory.create({ intermediates: true });
    return directory;
}

/**
 * A placa is identified by the days it covers, not just "week".
 *
 * Both ends matter. The recap is published in instalments — the week opens on
 * Friday with Monday to Friday in it, takes Saturday on Saturday evening and
 * closes on Sunday — so one week produces three different placas that all
 * start on the same Monday. Keying on `from` alone served Friday's picture all
 * weekend, with a date on it that no longer matched the screen around it.
 */
function placaFileName(
    period: RecapPeriod,
    from: string,
    to: string,
    kind: PlacaKind,
): string {
    return `${period}-${from}-${to}-${kind}.png`;
}

/**
 * Drop the placas of earlier instalments of this same period type.
 *
 * Without this the cache keeps every version of every week forever. The OS
 * empties this directory under pressure, but not before it has grown for
 * months, and nothing in here is worth keeping once its dates have passed.
 */
function pruneStale(directory: Directory, period: RecapPeriod, keep: string): void {
    try {
        for (const entry of directory.list()) {
            const name = entry.name;
            /**
             * Only earlier instalments of this same period, which is what the
             * paragraph above always meant. Matching on the full prefix alone
             * also swept away the other period's placas: opening the month
             * deleted the week's, going back deleted the month's, and the
             * screen — which remembers the files it downloaded — then skipped
             * re-downloading them and drew nothing.
             */
            if (
                name.endsWith('.png') &&
                name.startsWith(`${period}-`) &&
                !name.startsWith(keep)
            ) {
                new File(directory, name).delete();
            }
        }
    } catch (error) {
        console.warn('[Recap] could not prune the placa cache', error);
    }
}

export const RecapService = {
    getMyRecap: async (period: RecapPeriod): Promise<Recap> => {
        const response = await api.get<Recap>('/analytics/me/recap', {
            params: { period },
        });
        return response.data;
    },

    /**
     * The placa, as the very PNG the website renders.
     *
     * The design is one component drawn at 1080x1920 and exported by the site;
     * downloading it is what keeps the app from being a third implementation
     * that drifts from the other two at the first tweak. The site's route takes
     * the backend JWT on an Authorization header, the same token the app
     * already uses everywhere else.
     */
    downloadPlaca: async ({
        period,
        from,
        to,
        kind,
        accessToken,
    }: {
        period: RecapPeriod;
        from: string;
        to: string;
        kind: PlacaKind;
        accessToken: string;
    }): Promise<string> => {
        const directory = placasDirectory();
        const file = new File(directory, placaFileName(period, from, to, kind));
        if (file.exists) return file.uri;

        pruneStale(directory, period, `${period}-${from}-${to}-`);

        const downloaded = await File.downloadFileAsync(
            `${WEB_URL}/api/og/recap?period=${period}&kind=${kind}`,
            file,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
                idempotent: true,
            },
        );
        return downloaded.uri;
    },

    /** Drops cached placas, for a pull-to-refresh that means it. */
    clearCache: () => {
        try {
            const directory = new Directory(Paths.cache, PLACAS_DIR);
            if (directory.exists) directory.delete();
        } catch (error) {
            console.warn('[Recap] could not clear the placa cache', error);
        }
    },
};
