import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    View, StyleSheet, Dimensions, ActivityIndicator,
    TouchableOpacity, Text, RefreshControl, Platform,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedScrollHandler,
    useAnimatedRef, scrollTo, runOnJS,
} from 'react-native-reanimated';
import dayjs from 'dayjs';
import { ChannelWithSchedules } from '../../types/channel';
import { ProgramRow } from './ProgramRow';
import { ChannelLogo } from './ChannelLogo';
import { TimeHeaderMarkers } from './TimeHeader';
import { CollapsibleBanner } from '../CollapsibleBanner';
import { layout, fontSize, fontWeight } from '../../theme/tokens';
import { getTheme } from '../../theme';

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
}

export const ScheduleGrid = ({ channels, loading, bannerContent, stickyNavContent, onRefresh, refreshing }: ScheduleGridProps) => {
    const theme = getTheme('dark');

    // --- Scroll refs (reanimated, UI-thread capable) ---
    const leftScrollRef = useAnimatedRef<Animated.ScrollView>();
    const rightScrollRef = useAnimatedRef<Animated.ScrollView>();
    const horizontalScrollRef = useAnimatedRef<Animated.ScrollView>();

    const initialScrollDone = useRef(false);

    // --- Grid height measurement (inner vertical scroll needs explicit height) ---
    const [gridHeight, setGridHeight] = useState(0);
    const programsAreaHeight = gridHeight > 0 ? gridHeight - TIME_HEADER_HEIGHT : 0;

    // --- Now line offset (no CHANNEL_COL_WIDTH — programs are in their own column) ---
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

    // --- Banner collapse (binary: visible at top, hidden when scrolled) ---
    const [isBannerVisible, setIsBannerVisible] = useState(true);

    const handleBannerVisibility = useCallback((currentY: number) => {
        const THRESHOLD = 10;
        if (currentY <= THRESHOLD) {
            setIsBannerVisible(true);
        } else {
            setIsBannerVisible(false);
        }
    }, []);

    // --- FAB visibility ---
    const [isFabVisible, setIsFabVisible] = useState(false);

    const checkFabVisibility = useCallback((offsetX: number) => {
        const now = dayjs();
        const minutes = now.hour() * 60 + now.minute();
        const screenWidth = Dimensions.get('window').width;
        const visibleProgramWidth = screenWidth - CHANNEL_COL_WIDTH;
        const idealX = Math.max(0, (minutes * PIXELS_PER_MINUTE) - (visibleProgramWidth / 2));

        if (Math.abs(offsetX - idealX) > visibleProgramWidth / 2) {
            setIsFabVisible(true);
        } else {
            setIsFabVisible(false);
        }
    }, []);

    // --- Vertical scroll sync: right drives left (UI thread, frame-perfect) ---
    const onRightVerticalScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollTo(leftScrollRef, 0, event.contentOffset.y, false);
            runOnJS(handleBannerVisibility)(event.contentOffset.y);
        },
    });

    // --- Horizontal scroll handler ---
    const onHorizontalScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            runOnJS(checkFabVisibility)(event.contentOffset.x);
        },
    });

    // --- Scroll to now ---
    const scrollToNow = useCallback((animated: boolean = true) => {
        const now = dayjs();
        const minutes = now.hour() * 60 + now.minute();
        const screenWidth = Dimensions.get('window').width;
        const visibleProgramWidth = screenWidth - CHANNEL_COL_WIDTH;
        const offset = (minutes * PIXELS_PER_MINUTE) - (visibleProgramWidth / 2);
        const targetX = Math.max(0, offset);

        scrollTo(horizontalScrollRef, targetX, 0, animated);
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
            {/* Collapsible Banner — outside all scroll views */}
            <CollapsibleBanner isVisible={isBannerVisible}>
                {bannerContent}
            </CollapsibleBanner>

            {/* Day selector + Categories — FIXED, never scrolls */}
            {stickyNavContent}

            {/* Main grid: left column (logos) + right column (timeline) */}
            <View
                style={styles.gridContainer}
                onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}
            >
                {/* LEFT COLUMN: CANAL label + channel logos */}
                <View style={[styles.leftColumn, { backgroundColor: theme.colors.background }]}>
                    <View style={[styles.canalLabel, {
                        backgroundColor: theme.colors.background,
                        borderRightColor: theme.colors.border,
                        borderBottomColor: theme.colors.border,
                    }]}>
                        <Text style={[styles.canalText, { color: theme.colors.textSecondary }]}>
                            CANAL
                        </Text>
                    </View>

                    {programsAreaHeight > 0 && (
                        <Animated.ScrollView
                            ref={leftScrollRef}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                            style={{ height: programsAreaHeight }}
                        >
                            {channels.map((channel) => (
                                <View key={channel.channel.id} style={[styles.logoRow, {
                                    backgroundColor: theme.colors.background,
                                    borderRightColor: theme.colors.border,
                                }]}>
                                    <ChannelLogo channel={channel.channel} />
                                </View>
                            ))}
                        </Animated.ScrollView>
                    )}
                </View>

                {/* RIGHT COLUMN: time header + programs (horizontally scrollable) */}
                <Animated.ScrollView
                    ref={horizontalScrollRef}
                    horizontal
                    onScroll={onHorizontalScroll}
                    scrollEventThrottle={16}
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    style={styles.rightColumn}
                >
                    <View style={{ width: TOTAL_WIDTH }}>
                        {/* Hour markers — sticky vertically (outside vertical scroll) */}
                        <TimeHeaderMarkers
                            hourWidth={HOUR_WIDTH}
                            totalWidth={TOTAL_WIDTH}
                        />

                        {/* Program rows — vertically scrollable */}
                        {programsAreaHeight > 0 && (
                            <Animated.ScrollView
                                ref={rightScrollRef}
                                onScroll={onRightVerticalScroll}
                                scrollEventThrottle={16}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled={Platform.OS === 'android'}
                                style={{ height: programsAreaHeight }}
                                refreshControl={
                                    onRefresh ? (
                                        <RefreshControl
                                            refreshing={refreshing ?? false}
                                            onRefresh={onRefresh}
                                            tintColor={theme.colors.primary}
                                        />
                                    ) : undefined
                                }
                            >
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
                            </Animated.ScrollView>
                        )}
                    </View>
                </Animated.ScrollView>
            </View>

            {/* EN VIVO FAB */}
            {isFabVisible && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    onPress={() => scrollToNow(true)}
                    activeOpacity={0.8}
                >
                    <View style={styles.fabDot} />
                    <Text style={styles.fabText}>EN VIVO</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    leftColumn: {
        width: CHANNEL_COL_WIDTH,
        zIndex: 10,
    },
    canalLabel: {
        width: CHANNEL_COL_WIDTH,
        height: TIME_HEADER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderBottomWidth: 1,
    },
    canalText: {
        fontWeight: fontWeight.bold,
        fontSize: fontSize.xs,
    },
    logoRow: {
        height: ROW_HEIGHT,
        width: CHANNEL_COL_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    },
    rightColumn: {
        flex: 1,
    },
    fab: {
        position: 'absolute',
        bottom: 84,
        right: 16,
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
        zIndex: 50,
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
