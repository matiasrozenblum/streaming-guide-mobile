import { Schedule } from './schedule';

export interface Category {
    id: number;
    name: string;
    description?: string;
    color?: string;
    order?: number;
}

export interface Channel {
    id: number;
    name: string;
    description?: string;
    logo_url?: string | null;
    handle?: string | null;
    youtube_channel_id?: string | null;
    order?: number | null;
    is_visible?: boolean;
    background_color?: string | null;
    show_only_when_scheduled?: boolean;
    categories?: Category[];
    created_at?: string;
    updated_at?: string;
}

export interface ChannelWithSchedules {
    channel: {
        id: number;
        name: string;
        logo_url: string | null;
        background_color: string | null;
        show_only_when_scheduled: boolean;
        handle?: string | null;
        categories?: Category[];
    };
    schedules: Schedule[];
}
