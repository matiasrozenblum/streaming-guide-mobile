import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Banner, LinkType } from '../types/banner';
import { trackEvent } from '../lib/analytics';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../theme/tokens';

const BANNER_HEIGHT = 120;
const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - (spacing.sm * 2); // Container has marginHorizontal

interface Props {
    banners: Banner[];
}

export const BannerCarousel = ({ banners }: Props) => {
    const [currentPage, setCurrentPage] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const isAutoScrolling = useRef(false);
    const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    const isLoopable = banners && banners.length > 1;

    // For infinite loop: [last, ...banners, first] so swiping past edges wraps around
    const loopData = useMemo(() => {
        if (!banners || banners.length <= 1) return banners || [];
        return [banners[banners.length - 1], ...banners, banners[0]];
    }, [banners]);

    // In loop mode, real items start at index 1
    const realToLoopIndex = useCallback((realIndex: number) => {
        return isLoopable ? realIndex + 1 : realIndex;
    }, [isLoopable]);

    const scrollToIndex = useCallback((index: number, animated: boolean) => {
        flatListRef.current?.scrollToOffset({
            offset: BANNER_WIDTH * index,
            animated,
        });
    }, []);

    const goToNextPage = useCallback(() => {
        if (!isLoopable) return;

        const nextRealIndex = (currentPage + 1) % banners.length;
        const nextLoopIndex = realToLoopIndex(currentPage) + 1;
        isAutoScrolling.current = true;
        scrollToIndex(nextLoopIndex, true);
        setCurrentPage(nextRealIndex);
    }, [currentPage, banners, isLoopable, realToLoopIndex, scrollToIndex]);

    const startAutoScroll = useCallback(() => {
        if (!isLoopable) return;
        if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
        autoScrollTimer.current = setInterval(goToNextPage, 5000);
    }, [isLoopable, goToNextPage]);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollTimer.current) {
            clearInterval(autoScrollTimer.current);
            autoScrollTimer.current = null;
        }
    }, []);

    useEffect(() => {
        startAutoScroll();
        return stopAutoScroll;
    }, [startAutoScroll, stopAutoScroll]);

    if (!banners || banners.length === 0) return null;

    const handlePress = (banner: Banner) => {
        trackEvent('banner_click', { action: banner.link_url, banner_id: banner.id || banner.title });
        if (banner.link_type === LinkType.EXTERNAL && banner.link_url) {
            Linking.openURL(banner.link_url);
        }
    };

    const handleScrollBeginDrag = () => {
        stopAutoScroll();
    };

    const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const loopIndex = Math.round(offsetX / BANNER_WIDTH);

        if (isLoopable) {
            // Scrolled to the clone of the last item (index 0) → jump to real last item
            if (loopIndex <= 0) {
                scrollToIndex(banners.length, false);
                setCurrentPage(banners.length - 1);
            }
            // Scrolled to the clone of the first item (index banners.length + 1) → jump to real first item
            else if (loopIndex >= banners.length + 1) {
                scrollToIndex(1, false);
                setCurrentPage(0);
            } else {
                // Normal case: loopIndex maps to real index (loopIndex - 1)
                setCurrentPage(loopIndex - 1);
            }
        } else {
            setCurrentPage(loopIndex);
        }

        isAutoScrolling.current = false;
        startAutoScroll();
    };

    const renderItem = ({ item }: { item: Banner }) => {
        const imageSrc = item.image_url_mobile || item.image_url;

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handlePress(item)}
                style={[styles.page, { width: BANNER_WIDTH }]}
            >
                <Image
                    source={{ uri: imageSrc }}
                    style={styles.image}
                    resizeMode="cover"
                />
                {item.description && (
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.gradient}
                    >
                        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                    </LinearGradient>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { height: BANNER_HEIGHT }]}>
            <FlatList
                ref={flatListRef}
                data={loopData}
                keyExtractor={(_, index) => `banner-${index}`}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={handleScrollBeginDrag}
                onMomentumScrollEnd={handleScrollEnd}
                getItemLayout={(_, index) => ({
                    length: BANNER_WIDTH,
                    offset: BANNER_WIDTH * index,
                    index,
                })}
                initialScrollIndex={isLoopable ? 1 : 0}
            />

            {banners.length > 1 && (
                <View style={styles.dotsContainer}>
                    {banners.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentPage === index ? styles.activeDot : styles.inactiveDot
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
        borderRadius: 12,
        overflow: 'hidden',
        marginHorizontal: spacing.sm,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#1f2937',
        height: BANNER_HEIGHT,
    },
    page: {
        height: BANNER_HEIGHT,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
        justifyContent: 'flex-end',
        padding: spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    description: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '400',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    dotsContainer: {
        position: 'absolute',
        bottom: spacing.sm,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    activeDot: {
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    inactiveDot: {
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
});

