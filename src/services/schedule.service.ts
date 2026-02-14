import api from './api';
import { DeviceService } from './device.service';
import { ChannelWithSchedules } from '../types/channel';
import { CacheService } from './cache.service';
import dayjs from 'dayjs';
import 'dayjs/locale/en';

const CACHE_KEYS = {
    TODAY_SCHEDULES: 'today-schedules',
    WEEK_SCHEDULES: 'week-schedules',
    CATEGORIES: 'categories',
};

const TTL = {
    SCHEDULES: 5 * 60 * 1000,   // 5 minutes
    CATEGORIES: 60 * 60 * 1000, // 1 hour
};

export const ScheduleService = {
    /**
     * V2 today endpoint with batched Redis reads (fast).
     * Used for initial load — returns only today's schedules.
     */
    async getTodaySchedulesV2(): Promise<ChannelWithSchedules[]> {
        const deviceId = await DeviceService.getDeviceId();
        const response = await api.get(`/channels/with-schedules/today/v2?live_status=true&deviceId=${deviceId}`);
        return response.data;
    },

    async getTodaySchedules(): Promise<ChannelWithSchedules[]> {
        const deviceId = await DeviceService.getDeviceId();
        const response = await api.get(`/channels/with-schedules/today?live_status=true&deviceId=${deviceId}`);
        return response.data;
    },

    async getWeekSchedules(): Promise<ChannelWithSchedules[]> {
        const deviceId = await DeviceService.getDeviceId();
        const response = await api.get(`/channels/with-schedules/week?live_status=true&deviceId=${deviceId}`);
        return response.data;
    },

    async getChannels(): Promise<any[]> {
        const response = await api.get('/channels');
        return response.data;
    },

    async getSchedulesByDate(date: string): Promise<ChannelWithSchedules[]> {
        const dayName = dayjs(date).locale('en').format('dddd').toLowerCase();
        const deviceId = await DeviceService.getDeviceId();

        console.log(`Fetching schedules for date: ${date} -> ${dayName}`);

        const response = await api.get(`/channels/with-schedules?day=${dayName}&live_status=true&deviceId=${deviceId}`);
        return response.data;
    },

    async getCategories(): Promise<any[]> {
        const response = await api.get('/categories');
        return response.data;
    },

    // --- Cached versions for stale-while-revalidate pattern ---

    /**
     * Get cached today schedules (v2 endpoint).
     * Returns cached data immediately if available, fetches fresh in background.
     */
    async getCachedTodaySchedules(): Promise<{ data: ChannelWithSchedules[]; fromCache: boolean }> {
        const cached = await CacheService.get<ChannelWithSchedules[]>(CACHE_KEYS.TODAY_SCHEDULES);
        if (cached) {
            return { data: cached.data, fromCache: true };
        }
        // No cache — must fetch
        const data = await this.getTodaySchedulesV2();
        await CacheService.set(CACHE_KEYS.TODAY_SCHEDULES, data, TTL.SCHEDULES);
        return { data, fromCache: false };
    },

    /**
     * Fetch fresh today schedules and update cache.
     */
    async refreshTodaySchedules(): Promise<ChannelWithSchedules[]> {
        const data = await this.getTodaySchedulesV2();
        await CacheService.set(CACHE_KEYS.TODAY_SCHEDULES, data, TTL.SCHEDULES);
        return data;
    },

    /**
     * Get cached week schedules.
     */
    async getCachedWeekSchedules(): Promise<{ data: ChannelWithSchedules[]; fromCache: boolean }> {
        const cached = await CacheService.get<ChannelWithSchedules[]>(CACHE_KEYS.WEEK_SCHEDULES);
        if (cached) {
            return { data: cached.data, fromCache: true };
        }
        // No cache — don't block here, return empty. Phase 2 will fetch fresh data.
        return { data: [], fromCache: false };
    },

    /**
     * Fetch fresh week schedules and update cache.
     */
    async refreshWeekSchedules(): Promise<ChannelWithSchedules[]> {
        const data = await this.getWeekSchedules();
        await CacheService.set(CACHE_KEYS.WEEK_SCHEDULES, data, TTL.SCHEDULES);
        return data;
    },

    /**
     * Get cached categories.
     */
    async getCachedCategories(): Promise<{ data: any[]; fromCache: boolean }> {
        const cached = await CacheService.get<any[]>(CACHE_KEYS.CATEGORIES);
        if (cached) {
            return { data: cached.data, fromCache: true };
        }
        // No cache — don't block here, return empty. Phase 2 will fetch fresh data.
        return { data: [], fromCache: false };
    },

    /**
     * Fetch fresh categories and update cache.
     */
    async refreshCategories(): Promise<any[]> {
        const data = await this.getCategories();
        await CacheService.set(CACHE_KEYS.CATEGORIES, data, TTL.CATEGORIES);
        return data;
    },

    /**
     * Invalidate schedule caches (called on SSE events).
     */
    async invalidateScheduleCache(): Promise<void> {
        await CacheService.invalidate(CACHE_KEYS.TODAY_SCHEDULES);
        await CacheService.invalidate(CACHE_KEYS.WEEK_SCHEDULES);
    },
};
