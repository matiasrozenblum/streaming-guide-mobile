import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, StatusBar as RNStatusBar, Platform, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/en';

import { ScheduleGrid } from '../components/ScheduleGrid/ScheduleGrid';
import { Header } from '../components/Header';
import { BannerCarousel } from '../components/BannerCarousel';
import { DaySelector } from '../components/DaySelector';
import { ScheduleService } from '../services/schedule.service';
import { BannerService } from '../services/banner.service';
import { Banner } from '../types/banner';
import { ChannelWithSchedules } from '../types/channel';
import { CategorySelector } from '../components/CategorySelector';
import { Category } from '../types/channel';
import { useLiveStatus } from '../hooks/useLiveStatus';
import { useAuth } from '../context/AuthContext';

/**
 * Merge fresh today data (from V2 endpoint) into existing week data.
 * Replaces today's schedules in each channel with fresh live-status data,
 * keeping other days' schedules intact for day-switching.
 */
function mergeTodayIntoWeek(
    weekData: ChannelWithSchedules[],
    todayData: ChannelWithSchedules[],
): ChannelWithSchedules[] {
    if (weekData.length === 0) return todayData;

    const todayDay = dayjs().locale('en').format('dddd').toLowerCase();
    const todayByChannelId = new Map(todayData.map(ch => [ch.channel.id, ch]));

    const merged = weekData.map(weekCh => {
        const todayCh = todayByChannelId.get(weekCh.channel.id);
        if (!todayCh) return weekCh;

        // Replace today's schedules with fresh data, keep other days
        const otherDaySchedules = weekCh.schedules.filter(s => s.day_of_week !== todayDay);
        return {
            ...weekCh,
            schedules: [...otherDaySchedules, ...todayCh.schedules],
        };
    });

    // Add any channels from today that weren't in week data
    for (const todayCh of todayData) {
        if (!weekData.some(w => w.channel.id === todayCh.channel.id)) {
            merged.push(todayCh);
        }
    }

    return merged;
}

export const HomeScreen = () => {
    const { isAuthenticated } = useAuth();
    const [weekChannels, setWeekChannels] = useState<ChannelWithSchedules[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD or empty for today
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const weekLoadedRef = useRef(false);

    /**
     * Stale-while-revalidate loading strategy:
     * Phase 1: Show cached data instantly (no spinner) — cache-only, no network
     * Phase 2: Fire independent fetches — each updates state as it resolves:
     *   - Banners (~800ms) → setBanners immediately
     *   - Categories (~800ms) → setCategories immediately
     *   - V2 today (~1.7s) → merge fresh live status into week data
     *   - Full week (~11s, background) → replace weekChannels for day-switching
     */
    const loadData = async (showLoading = true) => {
        const t0 = Date.now();
        console.log('[Perf] loadData START');

        try {
            // Phase 1: Cache-only reads (instant, no network)
            const [cachedSchedules, cachedCategories] = await Promise.all([
                ScheduleService.getCachedWeekSchedules(),
                ScheduleService.getCachedCategories(),
            ]);

            if (cachedSchedules.fromCache || cachedCategories.fromCache) {
                if (cachedSchedules.fromCache) {
                    setWeekChannels(cachedSchedules.data);
                    weekLoadedRef.current = true;
                }
                if (cachedCategories.fromCache) {
                    setCategories(cachedCategories.data);
                }
                setLoading(false);
                console.log(`[Perf] Cache hit — showing cached data (${Date.now() - t0}ms)`);
            } else if (showLoading) {
                setLoading(true);
            }

            // Phase 2: Independent fetches — each updates state as it resolves

            // Banners (independent, ~800ms)
            BannerService.getBanners()
                .then(data => {
                    console.log(`[Perf] getBanners: ${Date.now() - t0}ms (${data.length} banners)`);
                    setBanners(data);
                })
                .catch(err => console.warn('[Perf] Banner fetch failed:', err));

            // Categories (independent, ~800ms)
            ScheduleService.refreshCategories()
                .then(data => {
                    console.log(`[Perf] refreshCategories: ${Date.now() - t0}ms (${data.length} categories)`);
                    setCategories(data);
                })
                .catch(err => console.warn('[Perf] Categories fetch failed:', err));

            // V2 today schedules (fast, ~1.7s) — await to show live status quickly
            try {
                const todayData = await ScheduleService.refreshTodaySchedules();
                console.log(`[Perf] refreshTodaySchedules (V2): ${Date.now() - t0}ms (${todayData.length} channels)`);
                setWeekChannels(prev => mergeTodayIntoWeek(prev, todayData));
                weekLoadedRef.current = true;
                setLoading(false);
            } catch (err) {
                console.warn('[Perf] V2 today fetch failed:', err);
            }

            // Full week schedules (background, ~11s) — for day-switching support
            ScheduleService.refreshWeekSchedules()
                .then(weekData => {
                    console.log(`[Perf] refreshWeekSchedules (background): ${Date.now() - t0}ms (${weekData.length} channels)`);
                    setWeekChannels(weekData);
                })
                .catch(err => console.warn('[Perf] Week schedules fetch failed:', err));

        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter week data by selected day (client-side, instant switching)
    const selectedDayName = selectedDate
        ? dayjs(selectedDate).locale('en').format('dddd').toLowerCase()
        : dayjs().locale('en').format('dddd').toLowerCase();

    const filteredByDay: ChannelWithSchedules[] = weekChannels
        .map(ch => ({
            ...ch,
            schedules: ch.schedules.filter(s => s.day_of_week === selectedDayName),
        }))
        .filter(ch => ch.schedules.length > 0);

    // Load data on focus and when auth state changes (login/logout)
    useFocusEffect(
        useCallback(() => {
            loadData(!weekLoadedRef.current);
        }, [isAuthenticated])
    );

    // SSE: refresh data when backend emits live status / schedule changes
    const handleSSERefresh = useCallback(() => {
        loadData(false);
    }, []);

    useLiveStatus(handleSSERefresh);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Pull-to-refresh: invalidate cache first, then fetch fresh
        await ScheduleService.invalidateScheduleCache();
        await loadData(false);
        setRefreshing(false);
    }, []);

    const filteredChannels = selectedCategory
        ? filteredByDay.filter(c => c.channel.categories?.some(cat => cat.id === selectedCategory.id))
        : filteredByDay;

    const renderHeaderContent = () => (
        <View>
            <BannerCarousel banners={banners} />
            <DaySelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            {categories.length > 0 && (
                <CategorySelector
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                />
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                <Header />
                <ScheduleGrid
                    channels={filteredChannels}
                    loading={loading}
                    headerContent={renderHeaderContent()}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                />
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1E293B',
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#1E293B',
    },
});
