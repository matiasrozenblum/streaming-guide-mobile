/**
 * Only the parts of the backend's recap the app actually reads.
 *
 * The placa itself is rendered by the website and downloaded as a PNG, so the
 * app never needs the rankings or the grid — just enough to know which of the
 * four placas exist and what period they cover.
 */
export type RecapPeriod = 'week' | 'month';

export interface Recap {
    enough_data: boolean;
    /** How many plays a recap needs. Sent by the API so the copy cannot drift. */
    minimum_plays: number;
    period: { type: RecapPeriod | 'year'; from: string; to: string; label: string };
    top_programs: Array<{ program_id: number; program_name: string }>;
    top_streamers: Array<{ streamer_id: number; streamer_name: string }>;
    totals: { plays: number; distinct_programs: number; distinct_channels: number };
}

export const PLACA_ORDER = [
    'top-program',
    'program-list',
    'top-streamer',
    'streamer-list',
] as const;

export type PlacaKind = (typeof PLACA_ORDER)[number];

export const PLACA_LABELS: Record<PlacaKind, string> = {
    'top-program': 'Programa más visto',
    'program-list': 'Top programas',
    'top-streamer': 'Streamer más visto',
    'streamer-list': 'Top streamers',
};

/** The same gate the website obeys, so both show the same set of placas. */
export function canRender(kind: PlacaKind, recap: Recap): boolean {
    if (!recap.enough_data) return false;
    if (kind === 'top-program' || kind === 'program-list') {
        return recap.top_programs.length > 0;
    }
    return recap.top_streamers.length > 0;
}
