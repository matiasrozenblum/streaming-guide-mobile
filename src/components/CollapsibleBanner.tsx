import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useDerivedValue,
    SharedValue,
    interpolate,
    Extrapolation
} from 'react-native-reanimated';

interface CollapsibleBannerProps {
    children: React.ReactNode;
    scrollY: SharedValue<number>;
}

const BANNER_HEIGHT = 152;
const SCROLL_THRESHOLD = 50; // Collapse after 50px of scrolling

export const CollapsibleBanner = ({ children, scrollY }: CollapsibleBannerProps) => {

    // Derived value: 0 = hidden, 1 = visible
    const visibility = useDerivedValue(() => {
        return scrollY.value > SCROLL_THRESHOLD ? 0 : 1;
    });

    const animatedStyle = useAnimatedStyle(() => {
        const isVisible = visibility.value === 1;

        return {
            height: withTiming(isVisible ? BANNER_HEIGHT : 0, { duration: 300 }),
            opacity: withTiming(isVisible ? 1 : 0, { duration: 200 }),
            transform: [
                {
                    translateY: withTiming(isVisible ? 0 : -50, { duration: 300 })
                }
            ],
            overflow: 'hidden',
        };
    });

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            {children}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: 'transparent', // Ensure it doesn't block background
    },
});
