import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    View, StyleSheet, Dimensions, ActivityIndicator,
    TouchableOpacity, Text, RefreshControl, ScrollView,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedScrollHandler,
    useAnimatedRef, scrollTo, runOnJS, runOnUI,
    useAnimatedReaction,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { ChannelWithSchedules } from '../../types/channel';
import { ProgramRow } from './ProgramRow';
import { ChannelLogo } from './ChannelLogo';
import { TimeHeaderMarkers } from './TimeHeader';
import { LegalFooter } from '../LegalFooter';
import { layout, fontSize, fontWeight } from '../../theme/tokens';
import { getTheme } from '../../theme';
import { trackEvent } from '../../lib/analytics';

const PIXELS_PER_MINUTE = layout.PIXELS_PER_MINUTE;
const HOUR_WIDTH = 60 * PIXELS_PER_MINUTE;
const TOTAL_WIDTH = 24 * HOUR_WIDTH;
const CHANNEL_COL_WIDTH = layout.CHANNEL_LABEL_WIDTH_MOBILE;
const ROW_HEIGHT = layout.ROW_HEIGHT_MOBILE;
const TIME_HEADER_HEIGHT = layout.TIME_HEADER_HEIGHT;

interface ScheduleGridProps {
    channels: ChannelWithSchedules[];
    loading: boolean;
    bannerContent?: React.ReactNode;
    stickyNavContent?: React.ReactNode;
    onRefresh?: () => void;
    refreshing?: boolean;
    selectedCategoryId?: number | null;
}

export const ScheduleGrid = ({ channels, loading, bannerContent, stickyNavContent, onRefresh, refreshing, selectedCategoryId }: ScheduleGridProps) => {
    const theme = getTheme('dark');
    const insets = useSafeAreaInsets();

    // --- Refs ---
    const horizontalScrollRef = useAnimatedRef<Animated.ScrollView>();
    const mainVerticalRef = useRef<ScrollView>(null);
    const headerScrollRef = useAnimatedRef<Animated.ScrollView>();

    // --- Shared Values ---
    const scrollX = useSharedValue(0);

    const initialScrollDone = useRef(false);
    const isFirstCategoryChange = useRef(true);

    // --- Scroll Handlers ---
    const onHorizontalScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
            scrollTo(headerScrollRef, event.contentOffset.x, 0, false);
        },
    });

    // --- Scroll to top when category changes ---
    useEffect(() => {
        if (isFirstCategoryChange.current) {
            isFirstCategoryChange.current = false;
            return;
        }
        mainVerticalRef.current?.scrollTo({ y: 0, animated: true });
    }, [selectedCategoryId]);

    // --- Now line offset ---
    const [nowOffset, setNowOffset] = useState(0);

    const calculateOffset = useCallback(() => {
        const now = dayjs();
        const minutes = now.hour() * 60 + now.minute();
        setNowOffset(minutes * PIXELS_PER_MINUTE);
    }, []);

    useEffect(() => {
        calculateOffset();
        const interval = setInterval(calculateOffset, 60000);
        return () => clearInterval(interval);
    }, [calculateOffset]);

    // --- FAB visibility ---
    const [isFabVisible, setIsFabVisible] = useState(false);
    const WINDOW_WIDTH = Dimensions.get('window').width;

    // Helper to check FAB visibility on JS thread
    const checkFab = (currentX: number) => {
        const now = dayjs();
        const minutes = now.hour() * 60 + now.minute();
        const screenWidth = Dimensions.get('window').width;
        const visibleProgramWidth = screenWidth - CHANNEL_COL_WIDTH;
        const idealX = Math.max(0, (minutes * PIXELS_PER_MINUTE) - (visibleProgramWidth / 2));

        const isVisible = Math.abs(currentX - idealX) > visibleProgramWidth / 2;
        setIsFabVisible(isVisible);
    };

    // Watch scrollX for FAB
    useAnimatedReaction(
        () => scrollX.value,
        (currentX) => {
            runOnJS(checkFab)(currentX);
        },
        [channels]
    );

    // --- Scroll to now ---
    const scrollToNow = useCallback((animated: boolean = true) => {
        const now = dayjs();
        const minutes = now.hour() * 60 + now.minute();
        const screenWidth = Dimensions.get('window').width;
        const visibleProgramWidth = screenWidth - CHANNEL_COL_WIDTH;
        const offset = (minutes * PIXELS_PER_MINUTE) - (visibleProgramWidth / 2);
        const targetX = Math.max(0, offset);

        runOnUI(() => {
            scrollTo(horizontalScrollRef, targetX, 0, animated);
        })();
    }, [horizontalScrollRef]);

    // Auto-scroll on first successful load
    useEffect(() => {
        if (!loading && channels.length > 0 && !initialScrollDone.current) {
            setTimeout(() => {
                scrollToNow(false);
                initialScrollDone.current = true;
            }, 100);
        }
    }, [loading, channels, scrollToNow]);

    // --- Loading state ---
    if (loading && channels.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/*
                Main Vertical ScrollView — uses native RN ScrollView (not reanimated)
                so that stickyHeaderIndices works properly with touch events.

                Layout:
                  [0] Banner — scrolls away naturally (no collapsible animation)
                  [1] Sticky Nav + Time Header — sticks to the top via stickyHeaderIndices
                  [2] Grid content — scrolls normally
                  [3] Footer
                  [4] Bottom padding
            */}
            <ScrollView
                ref={mainVerticalRef}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                bounces={false}
                stickyHeaderIndices={[1]}
                contentContainerStyle={{ paddingBottom: 0 }}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl
                            refreshing={!!refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.primary}
                            progressViewOffset={200}
                        />
                    ) : undefined
                }
            >
                {/* [0] Banner — scrolls away when user scrolls down */}
                <View>{bannerContent}</View>

                {/* [1] STICKY HEADER — sticks to top when banner scrolls off */}
                <View style={{ backgroundColor: theme.colors.background, zIndex: 100, elevation: 100 }}>
                    {stickyNavContent}

                    {/* Grid Header Row */}
                    <View style={[styles.headerRow, { borderBottomColor: theme.colors.border }]}>
                        {/* Channel Label Corner */}
                        <View style={[styles.canalLabel, {
                            backgroundColor: theme.colors.background,
                            borderRightColor: theme.colors.border,
                        }]}>
                            <Text style={[styles.canalText, { color: theme.colors.textSecondary }]}>
                                CANAL
                            </Text>
                        </View>

                        {/* Time Header (Synced with Horizontal Scroll) */}
                        <View style={styles.timeHeaderContainer}>
                            <Animated.ScrollView
                                ref={headerScrollRef}
                                horizontal
                                scrollEnabled={false}
                                showsHorizontalScrollIndicator={false}
                                pointerEvents="none"
                                contentContainerStyle={{ width: TOTAL_WIDTH, height: TIME_HEADER_HEIGHT }}
                            >
                                <TimeHeaderMarkers
                                    hourWidth={HOUR_WIDTH}
                                    totalWidth={TOTAL_WIDTH}
                                />
                            </Animated.ScrollView>
                        </View>
                    </View>
                </View>

                {/* [2] MAIN CONTENT ROW */}
                <View style={styles.gridRow}>
                    {/* Left Column: Logos */}
                    <View style={[styles.leftColumn, { backgroundColor: theme.colors.background }]}>
                        {channels.map((channel) => (
                            <View key={channel.channel.id} style={[styles.logoRow, {
                                backgroundColor: theme.colors.background,
                                borderRightColor: theme.colors.border,
                            }]}>
                                <ChannelLogo channel={{ ...channel.channel, logo_url: channel.channel.logo_url || '' }} />
                            </View>
                        ))}
                    </View>

                    {/* Right Column: Horizontally Scrollable Programs */}
                    <View style={styles.rightColumn}>
                        <Animated.ScrollView
                            ref={horizontalScrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            onScroll={onHorizontalScroll}
                            scrollEventThrottle={16}
                        >
                            <View>
                                {channels.map((channel, index) => (
                                    <ProgramRow
                                        key={channel.channel.id}
                                        channel={channel}
                                        index={index}
                                        pixelsPerMinute={PIXELS_PER_MINUTE}
                                        nowOffset={nowOffset}
                                        totalWidth={TOTAL_WIDTH}
                                    />
                                ))}
                            </View>
                        </Animated.ScrollView>
                    </View>
                </View>

                {/* [3] Footer */}
                <LegalFooter width={WINDOW_WIDTH} />

                {/* [4] Extra padding for tab bar + safe area */}
                <View style={{ height: 68 + insets.bottom + 16 }} />

            </ScrollView>

            {/* EN VIVO FAB */}
            {isFabVisible && (
                <View style={styles.fabWrapper} pointerEvents="box-none">
                    <TouchableOpacity
                        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                        onPress={() => {
                            scrollToNow(true);
                            trackEvent('scroll_to_now', { action: 'scroll_to_now' });
                        }}
                        activeOpacity={0.8}
                    >
                        <View style={styles.fabDot} />
                        <Text style={styles.fabText}>EN VIVO</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        height: TIME_HEADER_HEIGHT,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    canalLabel: {
        width: CHANNEL_COL_WIDTH,
        height: TIME_HEADER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        zIndex: 20,
    },
    canalText: {
        fontWeight: fontWeight.bold,
        fontSize: fontSize.xs,
    },
    timeHeaderContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    gridRow: {
        flexDirection: 'row',
    },
    leftColumn: {
        width: CHANNEL_COL_WIDTH,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.12)',
    },
    logoRow: {
        height: ROW_HEIGHT,
        width: CHANNEL_COL_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    },
    rightColumn: {
        flex: 1,
        overflow: 'hidden',
    },
    fabWrapper: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 50,
    },
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    fabDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        marginRight: 8,
    },
    fabText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
