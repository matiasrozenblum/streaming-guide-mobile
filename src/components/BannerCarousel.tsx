import React, { useState, useEffect, useRef, useCallback } from 'react';
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

    const goToNextPage = useCallback(() => {
        if (!banners || banners.length <= 1) return;

        const nextIndex = (currentPage + 1) % banners.length;
        isAutoScrolling.current = true;
        flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
        });
        setCurrentPage(nextIndex);
    }, [currentPage, banners]);

    useEffect(() => {
        if (!banners || banners.length <= 1) return;
        const interval = setInterval(goToNextPage, 5000);
        return () => clearInterval(interval);
    }, [banners, goToNextPage]);

    if (!banners || banners.length === 0) return null;

    const handlePress = (banner: Banner) => {
        trackEvent('banner_click', { action: banner.link_url, banner_id: banner.id || banner.title });
        if (banner.link_type === LinkType.EXTERNAL && banner.link_url) {
            Linking.openURL(banner.link_url);
        }
    };

    const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isAutoScrolling.current) {
            isAutoScrolling.current = false;
            return;
        }
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH);
        if (newIndex !== currentPage && newIndex >= 0 && newIndex < banners.length) {
            setCurrentPage(newIndex);
        }
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
                data={banners}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                getItemLayout={(_, index) => ({
                    length: BANNER_WIDTH,
                    offset: BANNER_WIDTH * index,
                    index,
                })}
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

