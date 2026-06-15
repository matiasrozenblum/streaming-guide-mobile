export interface ZapItem {
    id: number;
    name: string;
    logoUrl?: string | null;
    backgroundColor?: string | null;
    videoUrl: string | null;
    service: 'youtube' | 'twitch' | 'kick' | null;
    isLive: boolean;
    programName?: string | null;
}
