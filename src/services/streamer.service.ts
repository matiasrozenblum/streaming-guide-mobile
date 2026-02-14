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
};
