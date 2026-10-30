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
 * A placa is identified by the period it covers, not just "week": a file for
 * last week must not be served for this one. `from` is the period's first day,
 * which the recap already carries.
 */
function placaFileName(period: RecapPeriod, from: string, kind: PlacaKind): string {
    return `${period}-${from}-${kind}.png`;
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
        kind,
        accessToken,
    }: {
        period: RecapPeriod;
        from: string;
        kind: PlacaKind;
        accessToken: string;
    }): Promise<string> => {
        const file = new File(placasDirectory(), placaFileName(period, from, kind));
        if (file.exists) return file.uri;

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
