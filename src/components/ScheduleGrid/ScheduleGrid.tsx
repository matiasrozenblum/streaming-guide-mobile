import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    View, StyleSheet, Dimensions, ActivityIndicator,
    TouchableOpacity, Text, RefreshControl, Platform,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedScrollHandler,
    useAnimatedRef, scrollTo, runOnJS, runOnUI,
    useAnimatedReaction, withTiming,
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

    // --- Refs ---
    const horizontalScrollRef = useAnimatedRef<Animated.ScrollView>();
    const verticalScrollRef = useAnimatedRef<Animated.ScrollView>();
    const leftColumnRef = useAnimatedRef<Animated.ScrollView>();

    // --- Shared Values ---
    const scrollX = useSharedValue(0);
    const scrollY = useSharedValue(0);

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

    // --- Sync Left Column (Logos) with Right Column (Programs) ---
    useAnimatedReaction(
        () => scrollY.value,
        (y) => {
            scrollTo(leftColumnRef, 0, y, false);
        }
    );

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
            {/* Collapsible Banner — outside all scroll views */}
            <CollapsibleBanner scrollY={scrollY}>
                {bannerContent}
            </CollapsibleBanner>

            {/* Sticky Nav (Day Selector etc) */}
            {stickyNavContent}

            {/* Main grid Layout */}
            <View style={styles.gridContainer}>

                {/* LEFT COLUMN: Fixed X, Scrolls Y (Synced) */}
                <View style={[styles.leftColumn, { backgroundColor: theme.colors.background, zIndex: 20 }]}>
                    {/* Corner Label (Fixed) */}
                    <View style={[styles.canalLabel, {
                        backgroundColor: theme.colors.background,
                        borderRightColor: theme.colors.border,
                        borderBottomColor: theme.colors.border,
                        zIndex: 30,
                    }]}>
                        <Text style={[styles.canalText, { color: theme.colors.textSecondary }]}>
                            CANAL
                        </Text>
                    </View>

                    {/* Scroller for Logos */}
                    <Animated.ScrollView
                        ref={leftColumnRef}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={false} // Disable touch, strictly controlled by sync
                        style={{ flex: 1 }}
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
                </View>

                {/* RIGHT COLUMN: Scrolls X (Horizontal) */}
                <View style={styles.rightColumn}>
                    <Animated.ScrollView
                        ref={horizontalScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        onScroll={onHorizontalScroll}
                        scrollEventThrottle={16}
                    >
                        <View>
                            {/* Time Header (Sticky within Horizontal) */}
                            <View style={{ height: TIME_HEADER_HEIGHT, zIndex: 15 }}>
                                <TimeHeaderMarkers
                                    hourWidth={HOUR_WIDTH}
                                    totalWidth={TOTAL_WIDTH}
                                />
                            </View>

                            {/* Main Vertical Content (Scrolls Y) */}
                            <Animated.ScrollView
                                ref={verticalScrollRef}
                                showsVerticalScrollIndicator={true}
                                onScroll={onVerticalScroll}
                                scrollEventThrottle={16}
                                contentContainerStyle={{ flexDirection: 'column' }}
                                refreshControl={
                                    onRefresh ? (
                                        <RefreshControl
                                            refreshing={!!refreshing}
                                            onRefresh={onRefresh}
                                            tintColor={theme.colors.primary}
                                        />
                                    ) : undefined
                                }
                            >
                                <View style={{ width: TOTAL_WIDTH }}>
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
                    </Animated.ScrollView>
                </View>
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
