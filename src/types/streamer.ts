import { Category } from './channel';

export enum StreamingService {
    TWITCH = 'twitch',
    YOUTUBE = 'youtube',
    KICK = 'kick',
    // Add others if needed
}

export interface StreamerService {
    service: StreamingService;
    url: string;
    channel_id?: string;
}

export interface Streamer {
    id: number;
    name: string;
    description?: string;
    logo_url?: string;
    is_live: boolean;
    services: StreamerService[];
    categories: Category[];
    is_subscribed?: boolean;
    order?: number;
    // Add other fields if needed from backend response
}
