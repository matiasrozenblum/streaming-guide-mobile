import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    View, StyleSheet, Dimensions, ActivityIndicator,
    TouchableOpacity, Text, RefreshControl, Platform, ScrollView
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedScrollHandler,
    useAnimatedRef, scrollTo, runOnJS, runOnUI,
    useAnimatedReaction, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import dayjs from 'dayjs';
import { ChannelWithSchedules } from '../../types/channel';
import { ProgramRow } from './ProgramRow';
import { ChannelLogo } from './ChannelLogo';
import { TimeHeaderMarkers } from './TimeHeader';
import { CollapsibleBanner } from '../CollapsibleBanner';
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
}

export const ScheduleGrid = ({ channels, loading, bannerContent, stickyNavContent, onRefresh, refreshing }: ScheduleGridProps) => {
    const theme = getTheme('dark');

    // --- Refs ---
    const horizontalScrollRef = useAnimatedRef<Animated.ScrollView>();
    const mainVerticalRef = useAnimatedRef<Animated.ScrollView>();

    // --- Shared Values ---
    const scrollX = useSharedValue(0);
    const scrollY = useSharedValue(0); // Driven by main vertical scroll

    const initialScrollDone = useRef(false);

    // --- Scroll Handlers ---
    const onHorizontalScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const onVerticalScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    // --- Header Animation (Sync with horizontal scroll) ---
    const headerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: -scrollX.value }]
        };
    });

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
                Main Vertical ScrollView handles the entire page vertical scrolling.
                We use stickyHeaderIndices to keep the Banner, Day Selector, and Time Header at top.
            */}
            <Animated.ScrollView
                ref={mainVerticalRef}
                onScroll={onVerticalScroll}
                scrollEventThrottle={16}
                stickyHeaderIndices={[0]} // Index 0 is the Header Container (Banner + Nav + TimeHeader)
                contentContainerStyle={{ paddingBottom: 0 }} // Footer has its own height
                refreshControl={
                    onRefresh ? (
                        <RefreshControl
                            refreshing={!!refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.primary}
                            progressViewOffset={200} // Push loader down below headers
                        />
                    ) : undefined
                }
            >
                {/* 
                    STICKY HEADER CONTAINER 
                    This entire block sticks to the top.
                    It contains:
                    1. Collapsible Banner (Self-collapsing based on scrollY)
                    2. Sticky Nav (Day Selector)
                    3. Grid Headers (Channel Label + Time Header)
                */}
                <View style={{ backgroundColor: theme.colors.background, zIndex: 100, elevation: 100 }}>
                    <CollapsibleBanner scrollY={scrollY}>
                        {bannerContent}
                    </CollapsibleBanner>

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
                            <Animated.View style={[
                                { width: TOTAL_WIDTH, height: TIME_HEADER_HEIGHT },
                                headerStyle
                            ]}>
                                <TimeHeaderMarkers
                                    hourWidth={HOUR_WIDTH}
                                    totalWidth={TOTAL_WIDTH}
                                />
                            </Animated.View>
                        </View>
                    </View>
                </View>

                {/* 
                    MAIN CONTENT ROW 
                    Left: Channel Logos (Static column)
                    Right: Program Grid (Horizontal ScrollView)
                */}
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

                {/* Footer at the bottom of the page */}
                <LegalFooter width={WINDOW_WIDTH} />

                {/* Extra padding for nav bar */}
                <View style={{ height: 80 }} />

            </Animated.ScrollView>

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
        overflow: 'hidden', // Clip the sliding header
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
        bottom: 100, // Lifted slightly higher above tab bar
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
