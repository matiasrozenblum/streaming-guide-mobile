export interface LiveStream {
    videoId: string;
    title: string;
    publishedAt: string;
    description: string;
    thumbnailUrl: string;
    channelTitle: string;
}

export interface Schedule {
    id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subscribed: boolean;
    program: {
        id: number;
        name: string;
        logo_url: string | null;
        description: string | null;
        stream_url: string | null;
        is_live: boolean;
        live_streams?: LiveStream[] | null;
        stream_count?: number;
        panelists: { id: number; name: string }[];
        channel: {
            id: number;
            name: string;
            logo_url: string | null;
        };
        style_override?: string | null;
    };
    isWeeklyOverride?: boolean;
    overrideType?: 'cancel' | 'time_change' | 'reschedule';
    programId?: number;
    panelistIds?: number[];
}
