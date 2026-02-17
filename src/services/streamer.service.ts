import api from './api';
import { Streamer } from '../types/streamer';

export const StreamerService = {
    getAll: async (): Promise<Streamer[]> => {
        try {
            const response = await api.get<Streamer[]>('/streamers/visible');
            return response.data;
        } catch (error) {
            console.error('Error fetching streamers:', error);
            return [];
        }
    },

    getSubscriptions: async (accessToken: string): Promise<number[]> => {
        try {
            const response = await api.get<number[]>('/streamers/subscriptions/my', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            return [];
        }
    },

    subscribe: async (streamerId: number, accessToken: string): Promise<void> => {
        await api.post(`/streamers/${streamerId}/subscribe`, { notificationMethod: 'both' }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
    },

    unsubscribe: async (streamerId: number, accessToken: string): Promise<void> => {
        await api.delete(`/streamers/${streamerId}/unsubscribe`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
    },
};
