import api from './api';
import { ChannelWithSchedules } from '../types/channel';
import { CacheService } from './cache.service';
import { getNextMondayDate } from '../utils/dateUtils';
import dayjs from 'dayjs';
import 'dayjs/locale/en';

const CACHE_KEYS = {
    TODAY_SCHEDULES: 'today-schedules',
    WEEK_SCHEDULES: 'week-schedules',
    CATEGORIES: 'categories',
    NEXT_WEEK_MONDAY: 'next-week-monday-schedules',
};

const TTL = {
    SCHEDULES: 5 * 60 * 1000,   // 5 minutes
    CATEGORIES: 60 * 60 * 1000, // 1 hour
};

/**
 * How long past its TTL a cached value may still be shown.
 *
 * Stale-while-revalidate is what makes the grid appear instantly, and it is also
 * what keeps the app usable with no connection — so stale data is still served.
 * But it was served with no limit at all: when the refresh kept failing, a cache
 * entry from days earlier stayed on screen as if it were current, showing the
 * wrong day's programming with no indication anything was wrong.
 *
 * A schedule grid older than this is more likely to mislead than to help — it is
 * probably a different day entirely — so past this point it is discarded and the
 * screen waits for real data instead. Categories change rarely and carry no such
 * risk, so they keep a long ceiling.
 */
const MAX_STALE = {
    SCHEDULES: 12 * 60 * 60 * 1000, // 12 hours
    CATEGORIES: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const ScheduleService = {
    /**
     * V2 today endpoint with batched Redis reads (fast).
     * Used for initial load — returns only today's schedules.
     */
    async getTodaySchedulesV2(): Promise<ChannelWithSchedules[]> {
        // subscribed is resolved from the JWT (auto-injected by the api interceptor).
        // No deviceId: logged-out users must get subscribed:false.
        const response = await api.get(`/channels/with-schedules/today/v2?live_status=true`);
        return response.data;
    },

    async getTodaySchedules(): Promise<ChannelWithSchedules[]> {
        const response = await api.get(`/channels/with-schedules/today?live_status=true`);
        return response.data;
    },

    async getWeekSchedules(): Promise<ChannelWithSchedules[]> {
        const response = await api.get(`/channels/with-schedules/week?live_status=true`);
        return response.data;
    },

    async getNextWeekMondaySchedules(): Promise<ChannelWithSchedules[]> {
        const nextMonday = getNextMondayDate();
        const response = await api.get(
            `/channels/with-schedules/week?weekStart=${nextMonday}&live_status=true`
        );
        return response.data;
    },

    async getChannels(): Promise<any[]> {
        const response = await api.get('/channels');
        return response.data;
    },

    async getSchedulesByDate(date: string): Promise<ChannelWithSchedules[]> {
        const dayName = dayjs(date).locale('en').format('dddd').toLowerCase();

        console.log(`Fetching schedules for date: ${date} -> ${dayName}`);

        const response = await api.get(`/channels/with-schedules?day=${dayName}&live_status=true`);
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
    async getCachedTodaySchedules(): Promise<{ data: ChannelWithSchedules[]; fromCache: boolean; stale: boolean }> {
        const cached = await CacheService.get<ChannelWithSchedules[]>(CACHE_KEYS.TODAY_SCHEDULES);
        if (cached && cached.expiredForMs <= MAX_STALE.SCHEDULES) {
            return { data: cached.data, fromCache: true, stale: cached.stale };
        }
        // No usable cache — must fetch
        const data = await this.getTodaySchedulesV2();
        await CacheService.set(CACHE_KEYS.TODAY_SCHEDULES, data, TTL.SCHEDULES);
        return { data, fromCache: false, stale: false };
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
    async getCachedWeekSchedules(): Promise<{ data: ChannelWithSchedules[]; fromCache: boolean; stale: boolean }> {
        const cached = await CacheService.get<ChannelWithSchedules[]>(CACHE_KEYS.WEEK_SCHEDULES);
        if (cached && cached.expiredForMs <= MAX_STALE.SCHEDULES) {
            return { data: cached.data, fromCache: true, stale: cached.stale };
        }
        if (cached) {
            console.log(
                `[Schedules] Discarding week cache expired ${Math.round(cached.expiredForMs / 3600000)}h ago`,
            );
        }
        // No usable cache — don't block here, return empty. Phase 2 fetches fresh data.
        return { data: [], fromCache: false, stale: false };
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
    async getCachedCategories(): Promise<{ data: any[]; fromCache: boolean; stale: boolean }> {
        const cached = await CacheService.get<any[]>(CACHE_KEYS.CATEGORIES);
        if (cached && cached.expiredForMs <= MAX_STALE.CATEGORIES) {
            return { data: cached.data, fromCache: true, stale: cached.stale };
        }
        // No usable cache — don't block here, return empty. Phase 2 fetches fresh data.
        return { data: [], fromCache: false, stale: false };
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
