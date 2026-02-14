import api from './api';
import { Banner } from '../types/banner';

export const BannerService = {
    async getBanners(): Promise<Banner[]> {
        const response = await api.get('/banners/active');
        return response.data;
    }
};
