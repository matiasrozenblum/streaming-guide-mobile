import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Animated } from 'react-native';
import { Banner, LinkType } from '../types/banner';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../theme/tokens';

const BANNER_HEIGHT = 120;

interface Props {
    banners: Banner[];
}

export const BannerCarousel = ({ banners }: Props) => {
    const [currentPage, setCurrentPage] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const goToNext = useCallback(() => {
        // Fade out, switch, fade in
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setCurrentPage(prev => (prev + 1) % banners.length);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        });
    }, [banners.length, fadeAnim]);

    useEffect(() => {
        if (!banners || banners.length <= 1) return;
        const interval = setInterval(goToNext, 5000);
        return () => clearInterval(interval);
    }, [banners, goToNext]);

    if (!banners || banners.length === 0) return null;

    const handlePress = (banner: Banner) => {
        if (banner.link_type === LinkType.EXTERNAL && banner.link_url) {
            Linking.openURL(banner.link_url);
        }
    };

    const banner = banners[currentPage];
    const imageSrc = banner.image_url_mobile || banner.image_url;

    return (
        <View style={[styles.container, { height: BANNER_HEIGHT }]}>
            <Animated.View style={[styles.page, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handlePress(banner)}
                    style={styles.page}
                >
                    <Image
                        source={{ uri: imageSrc }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                    {banner.description && (
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={styles.gradient}
                        >
                            <Text style={styles.title} numberOfLines={1}>{banner.title}</Text>
                            <Text style={styles.description} numberOfLines={2}>{banner.description}</Text>
                        </LinearGradient>
                    )}
                </TouchableOpacity>
            </Animated.View>

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
        marginBottom: spacing.md, // 16px
        borderRadius: 12, // Spec 12px
        overflow: 'hidden',
        marginHorizontal: spacing.md, // 16px
        marginTop: spacing.md, // 16px
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#1f2937', // Placeholder bg
        height: BANNER_HEIGHT, // redundant but safe
    },
    page: {
        flex: 1,
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
        height: '100%', // Full height gradient? Spec says "Gradient Overlay", usually full or bottom half. 
        // Code used 100% with transparent -> black. This matches "to top, rgba(0,0,0,0.8), transparent" logic but inverted direction
        // Previous was ['transparent', 'rgba(0,0,0,0.8)'] which is Top->Bottom.
        // Spec: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" which means Bottom is black, Top is transparent.
        // So colors=['transparent', 'rgba(0,0,0,0.8)'] (default usage) puts first color at top?
        // expo-linear-gradient default is top to bottom. Transparency at top, Black at bottom. Correct.
        justifyContent: 'flex-end',
        padding: spacing.md, // 16px? Spec says padding 20px for content?
        // Spec prompt not explicit on padding inside banner, will stick to 12 or 16.
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    title: {
        color: 'white',
        fontSize: 18, // Spec: 18px Bold for mobile
        fontWeight: 'bold',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    description: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14, // Spec: 14px Regular
        fontWeight: '400',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    dotsContainer: {
        position: 'absolute',
        bottom: spacing.sm, // 8px
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6, // Spec: 6px gap
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
