export interface ZapItem {
    id: number;
    name: string;
    logoUrl?: string | null;
    backgroundColor?: string | null;
    videoUrl: string | null;
    service: 'youtube' | 'twitch' | 'kick' | null;
    isLive: boolean;
    programName?: string | null;
    /**
     * El programa al aire en ese canal, para que el zapeo pueda rankearse.
     * Los streamers no tienen: ahí el que manda es el id del streamer.
     */
    programId?: number | null;
    /** Streamer logos are square (1:1, cover); channel logos are rectangular (2:1, contain) */
    kind?: 'channel' | 'streamer';
}
