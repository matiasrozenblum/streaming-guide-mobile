import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Animated, TouchableOpacity, Text } from 'react-native';
import ReAnimated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, withTiming } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import { ChannelWithSchedules } from '../../types/channel';
import { ScheduleRow } from './ScheduleRow';
import { TimeHeader } from './TimeHeader';
import { layout } from '../../theme/tokens';
import { getTheme } from '../../theme';

const BANNER_TOTAL_HEIGHT = 152; // 120px content + 16px marginTop + 16px marginBottom
const COLLAPSE_DURATION = 250; // ms

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

    // --- Banner collapse (reanimated, binary: fully visible or fully hidden) ---
    const scrollY = useSharedValue(0);
    const bannerHeight = useSharedValue(BANNER_TOTAL_HEIGHT);
    const bannerOpacity = useSharedValue(1);

    const handleVerticalScroll = useCallback((event: any) => {
        scrollY.value = event.nativeEvent.contentOffset.y;
    }, []);

    // Toggle banner when scroll crosses the threshold
    useAnimatedReaction(
        () => scrollY.value <= 2,
        (isAtTop, prevIsAtTop) => {
            if (isAtTop !== prevIsAtTop) {
                bannerHeight.value = withTiming(
                    isAtTop ? BANNER_TOTAL_HEIGHT : 0,
                    { duration: COLLAPSE_DURATION }
                );
                bannerOpacity.value = withTiming(
                    isAtTop ? 1 : 0,
                    { duration: COLLAPSE_DURATION * 0.8 }
                );
            }
        },
        []
    );

    const bannerCollapseStyle = useAnimatedStyle(() => ({
        height: bannerHeight.value,
        opacity: bannerOpacity.value,
    }));

    // --- Horizontal scroll helpers ---
    const scrollToNow = (animated: boolean = true) => {
        if (scrollViewRef.current) {
            const now = dayjs();
            const minutes = now.hour() * 60 + now.minute();
            const screenWidth = Dimensions.get('window').width;
            const offset = (minutes * PIXELS_PER_MINUTE) - (screenWidth / 2) + (CHANNEL_COL_WIDTH / 2);
            const targetX = Math.max(0, offset);

            scrollX.setValue(targetX);
            scrollViewRef.current.scrollTo({ x: targetX, animated });
        }
    };

    useEffect(() => {
        if (!loading && channels.length > 0 && !initialScrollDone.current) {
            setTimeout(() => {
                scrollToNow(false);
                initialScrollDone.current = true;
            }, 100);
        }
    }, [loading, channels]);

    // --- Now line offset ---
    const [nowOffset, setNowOffset] = useState(0);

    const calculateOffset = () => {
        const now = dayjs();
        const minutes = now.hour() * 60 + now.minute();
        setNowOffset(CHANNEL_COL_WIDTH + (minutes * PIXELS_PER_MINUTE));
    };

    useEffect(() => {
        calculateOffset();
        const interval = setInterval(calculateOffset, 60000);
        return () => clearInterval(interval);
    }, []);

    // --- EN VIVO FAB visibility ---
    const [isFabVisible, setIsFabVisible] = useState(true);

    const checkFabVisibility = (scrollPosition: number) => {
        const screenWidth = Dimensions.get('window').width;
        const visibleStart = scrollPosition;
        const visibleEnd = scrollPosition + screenWidth;
        const isNowVisible = (nowOffset >= visibleStart - 50) && (nowOffset <= visibleEnd + 50);
        setIsFabVisible(!isNowVisible);
    };

    // --- FlashList data: STICKY_HEADER + channels (banner is outside) ---
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
            {/* Collapsing Banner — outside FlashList & horizontal scroll */}
            {bannerContent && (
                <ReAnimated.View style={[{ overflow: 'hidden' }, bannerCollapseStyle]}>
                    {bannerContent}
                </ReAnimated.View>
            )}

            {/* Horizontal Scroll for Time + FlashList */}
            <Animated.ScrollView
                horizontal
                ref={scrollViewRef}
                style={{ flex: 1 }}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ minWidth: Dimensions.get('window').width }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    {
                        useNativeDriver: true,
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
                                    index={index - 1} // Only STICKY_HEADER before channels
                                    pixelsPerMinute={PIXELS_PER_MINUTE}
                                    scrollX={scrollX}
                                    nowOffset={nowOffset}
                                />
                            );
                        }}
                        // @ts-ignore
                        estimatedItemSize={layout.ROW_HEIGHT_MOBILE}
                        keyExtractor={(item: any) => {
                            if (item.type === 'STICKY_HEADER') return 'sticky-header';
                            return item.channel.id.toString();
                        }}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={false}
                        drawDistance={1000}
                        stickyHeaderIndices={[0]} // STICKY_HEADER (days + categories + time)
                        onScroll={handleVerticalScroll}
                        scrollEventThrottle={16}
                        onRefresh={onRefresh}
                        refreshing={refreshing}
                        getItemType={(item: any) => item.type}
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
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    }
});
