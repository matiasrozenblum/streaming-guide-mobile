export interface ZapItem {
    id: number;
    name: string;
    logoUrl?: string | null;
    backgroundColor?: string | null;
    videoUrl: string | null;
    service: 'youtube' | 'twitch' | 'kick' | null;
    isLive: boolean;
    programName?: string | null;
    /** Streamer logos are square (1:1, cover); channel logos are rectangular (2:1, contain) */
    kind?: 'channel' | 'streamer';
}
