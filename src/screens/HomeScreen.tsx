import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, StatusBar as RNStatusBar, Platform, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { appApi } from '../services/api';
import { HolidayDialog } from '../components/HolidayDialog';
import { SeasonalDialog } from '../components/SeasonalDialog';
import { isBeforeInBuenosAires } from '../utils/dateUtils';
import { getARTDayName, getLocalToARTOffsetMinutes, localizeSchedule } from '../utils/timezone';

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

    const todayDay = getARTDayName();
    const todayByChannelId = new Map(todayData.map(ch => [ch.channel.id, ch]));

    const merged = weekData.map(weekCh => {
        const todayCh = todayByChannelId.get(weekCh.channel.id);
        if (!todayCh) return weekCh;

        // Replace today's schedules with fresh data, keep other days
        // Filter to only today's day — the v2 endpoint returns multi-day schedules
        // (e.g. virtual special events spanning the week), so we must not include
        // non-today schedules from the today response or they duplicate the week data.
        const todayOnlySchedules = todayCh.schedules.filter(s => s.day_of_week === todayDay);
        const otherDaySchedules = weekCh.schedules.filter(s => s.day_of_week !== todayDay);
        return {
            ...weekCh,
            schedules: [...otherDaySchedules, ...todayOnlySchedules],
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
    const [nextWeekMondayChannels, setNextWeekMondayChannels] = useState<ChannelWithSchedules[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(''); // English day name ('monday', etc.) or '' for today
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const weekLoadedRef = useRef(false);
    const isMountedRef = useRef(true);
    useEffect(() => () => { isMountedRef.current = false; }, []);

    // Holiday Dialogs
    const isSeasonActive = isBeforeInBuenosAires('2026-01-02');
    const [showSeasonal, setShowSeasonal] = useState(isSeasonActive);
    const [showHoliday, setShowHoliday] = useState(false);

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

            // Holiday (independent) — only show once per day
            if (!isSeasonActive) {
                appApi.getHoliday()
                    .then(async data => {
                        console.log(`[Perf] getHoliday: ${Date.now() - t0}ms, isHoliday: ${data.isHoliday}`);
                        if (!data.isHoliday) return;
                        const today = dayjs().format('YYYY-MM-DD');
                        const seen = await AsyncStorage.getItem('@holiday_dialog_seen');
                        if (seen !== today) {
                            setShowHoliday(true);
                        }
                    })
                    .catch(err => console.warn('[Perf] Holiday fetch failed:', err));
            }

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

            // Next-week Monday (for Sunday overflow) — background fetch, small payload
            ScheduleService.getNextWeekMondaySchedules()
                .then(data => {
                    if (isMountedRef.current) setNextWeekMondayChannels(data);
                })
                .catch(err => console.warn('[Perf] Next-week Monday fetch failed:', err));

        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter week data by selected day (client-side, instant switching)
    // selectedDate stores an English day name ('monday', 'friday', etc.) or '' for today
    const todayName = useMemo(() => dayjs().locale('en').format('dddd').toLowerCase(), []);
    const selectedDayName = selectedDate || todayName;
    const isViewingToday = !selectedDate || selectedDate === todayName;

    // Determine if selected day is before or after today within the current week (Mon–Sun)
    const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const todayWeekIndex = weekDays.indexOf(todayName);
    const selectedWeekIndex = weekDays.indexOf(selectedDayName);
    const isPastDay = !isViewingToday && selectedWeekIndex !== -1 && todayWeekIndex !== -1 && selectedWeekIndex < todayWeekIndex;

    const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const OVERFLOW_MINUTES = 240;

    const nextDayName = DAY_ORDER[(DAY_ORDER.indexOf(selectedDayName) + 1) % 7];

    const offsetFromART = useMemo(() => getLocalToARTOffsetMinutes(), []);

    // Localize all week schedules to device local time (no-op for ART users).
    // Also patches 24/7 programs with the live stream_url from whichever schedule is
    // currently marked is_live=true, so non-ART users see the correct stream URL.
    const localizedWeekChannels = useMemo(() => {
        const liveByProgramId = new Map<number, string>();
        for (const ch of weekChannels) {
            for (const s of ch.schedules) {
                if (s.program.is_live && s.program.stream_url) {
                    liveByProgramId.set(s.program.id, s.program.stream_url);
                }
            }
        }
        return weekChannels.map(ch => ({
            ...ch,
            schedules: ch.schedules.map(s => {
                const localized = localizeSchedule(s, offsetFromART);
                // 24/7 programs are not converted by localizeSchedule (timezone-agnostic).
                // Force is_live=true and correct stream_url so non-ART users get the live feed.
                const is24_7 = s.start_time.startsWith('00:00') && s.end_time.startsWith('23:59');
                if (is24_7 && liveByProgramId.has(s.program.id)) {
                    return {
                        ...localized,
                        program: {
                            ...localized.program,
                            is_live: true,
                            stream_url: liveByProgramId.get(s.program.id) ?? localized.program.stream_url,
                        },
                    };
                }
                return localized;
            }),
        }));
    }, [weekChannels, offsetFromART]);

    const localizedNextWeekMondayChannels = useMemo(() =>
        nextWeekMondayChannels.map(ch => ({
            ...ch,
            schedules: ch.schedules.map(s => localizeSchedule(s, offsetFromART)),
        })),
        [nextWeekMondayChannels, offsetFromART],
    );

    // Sunday overflow always uses next-week Monday data (localized) to avoid duplicating
    // ART-Sunday programs that shift into local Monday for users east of ART (e.g. UTC+13).
    const overflowSource = (selectedDayName === 'sunday' && localizedNextWeekMondayChannels.length > 0)
        ? localizedNextWeekMondayChannels
        : localizedWeekChannels;

    const filteredByDay: ChannelWithSchedules[] = localizedWeekChannels
        .map(ch => {
            const daySchedules = ch.schedules.filter(s => s.day_of_week === selectedDayName);

            const overflowCh = overflowSource.find(c => c.channel.id === ch.channel.id);
            const overflowSchedules = (overflowCh?.schedules ?? [])
                .filter(s => {
                    if (s.day_of_week !== nextDayName) return false;
                    const [h, m] = s.start_time.split(':').map(Number);
                    return (h * 60 + m) < OVERFLOW_MINUTES;
                })
                .map(s => ({ ...s, positionOffset: 24 * 60 }));

            // Deduplicate by composite key: timezone conversion can shift two ART-day
            // schedules with the same id (e.g. spanning virtual events) onto the same
            // local day, producing duplicate React keys and broken rendering.
            const seen = new Set<string>();
            const schedules = [...daySchedules, ...overflowSchedules].filter(s => {
                const key = `${s.id}_${s.positionOffset ?? 0}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            return { ...ch, schedules };
        })
        .filter(ch => ch.schedules.length > 0 || !ch.channel.show_only_when_scheduled);

    // Load data on focus and when auth state changes (login/logout)
    useFocusEffect(
        useCallback(() => {
            loadData(!weekLoadedRef.current);
        }, [isAuthenticated])
    );

    // SSE: refresh data when backend emits live status / schedule changes
    const handleSSERefresh = useCallback(() => {
        loadData(false);
        ScheduleService.getNextWeekMondaySchedules()
            .then(data => setNextWeekMondayChannels(data))
            .catch(() => {});
    }, []);

    useLiveStatus(handleSSERefresh);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Pull-to-refresh: invalidate cache first, then fetch fresh
        await ScheduleService.invalidateScheduleCache();
        await loadData(false);
        setRefreshing(false);
    }, []);

    const onResetToToday = useCallback(() => setSelectedDate(''), []);

    const filteredChannels = selectedCategory
        ? filteredByDay.filter(c => c.channel.categories?.some(cat => cat.id === selectedCategory.id))
        : filteredByDay;

    const renderBannerContent = () => (
        <BannerCarousel banners={banners} />
    );

    const renderStickyNavContent = () => (
        <View>
            <DaySelector selectedDate={selectedDate} onSelectDate={setSelectedDate} todayName={todayName} />
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
                {showSeasonal && (
                    <SeasonalDialog visible={showSeasonal} onClose={() => setShowSeasonal(false)} />
                )}
                {!isSeasonActive && showHoliday && (
                    <HolidayDialog
                        visible={showHoliday}
                        onClose={() => {
                            setShowHoliday(false);
                            AsyncStorage.setItem('@holiday_dialog_seen', dayjs().format('YYYY-MM-DD'));
                        }}
                    />
                )}
                <Header />
                <ScheduleGrid
                    channels={filteredChannels}
                    loading={loading}
                    bannerContent={renderBannerContent()}
                    stickyNavContent={renderStickyNavContent()}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                    selectedCategoryId={selectedCategory?.id ?? null}
                    isViewingToday={isViewingToday}
                    isPastDay={isPastDay}
                    onResetToToday={onResetToToday}
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
