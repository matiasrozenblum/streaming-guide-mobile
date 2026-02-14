import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Animated, TouchableOpacity, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import { ChannelWithSchedules } from '../../types/channel';
import { ScheduleRow } from './ScheduleRow';
import { TimeHeader } from './TimeHeader';
import { layout } from '../../theme/tokens';
import { getTheme } from '../../theme';
import { CollapsibleBanner } from '../CollapsibleBanner';

interface ScheduleGridProps {
    channels: ChannelWithSchedules[];
    loading: boolean;
}

const PIXELS_PER_MINUTE = layout.PIXELS_PER_MINUTE; // 2
const HOUR_WIDTH = 60 * PIXELS_PER_MINUTE; // 120
const TOTAL_WIDTH = 24 * HOUR_WIDTH; // 2880
const CHANNEL_COL_WIDTH = layout.CHANNEL_LABEL_WIDTH_MOBILE; // 122

export const ScheduleGrid = ({ channels, loading, bannerContent, stickyNavContent, onRefresh, refreshing }: ScheduleGridProps & { bannerContent?: React.ReactNode, stickyNavContent?: React.ReactNode, onRefresh?: () => void, refreshing?: boolean }) => {
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const initialScrollDone = useRef(false);
    const theme = getTheme('dark');

    const scrollToNow = (animated: boolean = true) => {
        if (scrollViewRef.current) {
            const now = dayjs();
            const minutes = now.hour() * 60 + now.minute();
            // Scroll so "now" is centered or at 1/3 screen
            const screenWidth = Dimensions.get('window').width;
            const offset = (minutes * PIXELS_PER_MINUTE) - (screenWidth / 2) + (CHANNEL_COL_WIDTH / 2);
            const targetX = Math.max(0, offset);

            // Manually set scrollX value to keep channel column in sync
            scrollX.setValue(targetX);
            scrollViewRef.current.scrollTo({ x: targetX, animated });
        }
    };

    // Auto-scroll on first successful load
    useEffect(() => {
        if (!loading && channels.length > 0 && !initialScrollDone.current) {
            setTimeout(() => {
                scrollToNow(false); // Use non-animated scroll initially to avoid sync issues
                initialScrollDone.current = true;
            }, 100); // Reduced timeout for faster initial positioning
        }
    }, [loading, channels]);

    const [nowOffset, setNowOffset] = useState(0);

    const calculateOffset = () => {
        const now = dayjs();
        const minutes = now.hour() * 60 + now.minute();
        // Offset = Channel Column Width + Time Offset
        setNowOffset(CHANNEL_COL_WIDTH + (minutes * PIXELS_PER_MINUTE));
    };

    const [isFabVisible, setIsFabVisible] = useState(true);

    // Track FAB visibility based on scroll position
    const checkFabVisibility = (scrollPosition: number) => {
        const screenWidth = Dimensions.get('window').width;
        const visibleStart = scrollPosition;
        const visibleEnd = scrollPosition + screenWidth;

        // If "now" line is within visible area, hide FAB. Otherwise show.
        const isNowVisible = (nowOffset >= visibleStart - 50) && (nowOffset <= visibleEnd + 50);
        setIsFabVisible(!isNowVisible);
    };

    useEffect(() => {
        calculateOffset();
        const interval = setInterval(calculateOffset, 60000); // 1 min update
        return () => clearInterval(interval);
    }, []);

    // Banner Visibility State
    const [isBannerVisible, setIsBannerVisible] = useState(true);
    const lastScrollY = useRef(0);

    const handleVerticalScroll = (event: any) => {
        const currentY = event.nativeEvent.contentOffset.y;

        // Threshold to avoid jitter
        const diff = currentY - lastScrollY.current;

        // Strict Spec Implementation:
        const THRESHOLD = 10;

        if (currentY <= THRESHOLD) {
            // At top -> Show
            if (!isBannerVisible) setIsBannerVisible(true);
        } else if (currentY > THRESHOLD) {
            // Scrolling down -> Hide
            if (isBannerVisible) setIsBannerVisible(false);
        }

        lastScrollY.current = currentY;
    };

    // BANNER scrolls away; STICKY_HEADER (days + categories + time) stays pinned
    const flatListData = [
        { type: 'STICKY_HEADER', id: 'STICKY_HEADER' },
        ...channels.map(c => ({ type: 'CHANNEL', ...c }))
    ];

    if (loading && channels.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <CollapsibleBanner isVisible={isBannerVisible}>
                {bannerContent}
            </CollapsibleBanner>
            <Animated.ScrollView
                horizontal
                ref={scrollViewRef}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ minWidth: Dimensions.get('window').width }} // Allow inner content to define size
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    {
                        useNativeDriver: true, // Native driver for smooth, flicker-free animations
                        listener: (event: any) => {
                            checkFabVisibility(event.nativeEvent.contentOffset.x);
                        },
                    }
                )}
                scrollEventThrottle={16}
                bounces={false}
            >
                <View style={{ width: TOTAL_WIDTH + CHANNEL_COL_WIDTH }}>
                    <FlashList
                        data={flatListData}
                        renderItem={({ item, index }) => {
                            // REMOVED BANNER CASE
                            if (item.type === 'STICKY_HEADER') {
                                return (
                                    <View style={{ backgroundColor: theme.colors.background }}>
                                        <Animated.View style={{
                                            width: Dimensions.get('window').width,
                                            transform: [{ translateX: scrollX }],
                                        }}>
                                            {stickyNavContent}
                                        </Animated.View>
                                        <TimeHeader
                                            width={TOTAL_WIDTH + CHANNEL_COL_WIDTH}
                                            hourWidth={HOUR_WIDTH}
                                            scrollX={scrollX}
                                        />
                                    </View>
                                );
                            }
                            // Channel Item
                            return (
                                <ScheduleRow
                                    channel={item as ChannelWithSchedules}
                                    index={index - 1} // Adjustment for STICKY_HEADER only (was -2)
                                    pixelsPerMinute={PIXELS_PER_MINUTE}
                                    scrollX={scrollX}
                                    nowOffset={nowOffset}
                                />
                            );
                        }}
                        // @ts-ignore
                        estimatedItemSize={layout.ROW_HEIGHT_MOBILE} // 60
                        keyExtractor={(item: any) => {
                            if (item.type === 'STICKY_HEADER') return 'sticky-header';
                            return item.channel.id.toString();
                        }}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={false}
                        drawDistance={1000}
                        stickyHeaderIndices={[0]} // STICKY_HEADER is now index 0
                        onRefresh={onRefresh}
                        refreshing={refreshing}
                        getItemType={(item: any) => item.type}
                        onScroll={handleVerticalScroll}
                        scrollEventThrottle={16}
                    />
                </View>
            </Animated.ScrollView>

            {/* En Vivo FAB */}
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
        // Spec: Border Radius 12px (Top Left/Right)
        borderTopLeftRadius: 12, // Spec says 12
        borderTopRightRadius: 12,
        overflow: 'hidden', // to clip content
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 84, // 76px bottom nav + 8px margin
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
    }
});
