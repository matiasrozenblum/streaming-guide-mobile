import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface CollapsibleBannerProps {
    children: React.ReactNode;
    isVisible: boolean;
}

const BANNER_HEIGHT = 152; // 120 (banner) + 16 (margin top) + 16 (margin bottom) roughly. 
// Actually BannerCarousel has height 120, marginTop 16, marginBottom 16. Total space = 152.
// Let's check BannerCarousel styles again.
// height: 120. marginTop: 16. marginBottom: 16.
// Total occupied vertical space = 120 + 16 + 16 = 152.

export const CollapsibleBanner = ({ children, isVisible }: CollapsibleBannerProps) => {
    const animation = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animation, {
            toValue: isVisible ? 1 : 0,
            duration: 300,
            useNativeDriver: false, // Height cannot be animated with native driver
        }).start();
    }, [isVisible]);

    const height = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 152], // Adjust if margins are handled differently
    });

    const opacity = animation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
    });

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [-50, 0],
    });

    return (
        <Animated.View style={[styles.container, { height, opacity, transform: [{ translateY }] }]}>
            {children}
            {/* We might need to ensure children don't overflow when height is small */}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        width: '100%',
    },
});
