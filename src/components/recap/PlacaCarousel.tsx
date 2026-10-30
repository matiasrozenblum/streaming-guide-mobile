import React, { useCallback, useRef } from 'react';
import {
    ActivityIndicator,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { getTheme } from '../../theme';
import { PlacaKind } from '../../types/recap';

export const PLACA_RATIO = 1080 / 1920;

export interface Slide {
    kind: PlacaKind;
    /** Local file once downloaded; null while it is still coming. */
    uri: string | null;
}

const GAP = 16;

/**
 * The placas as a swipeable row, the way the website's mobile layout reads:
 * one centred card with the next peeking at either side, so it is obvious
 * there is more to swipe to.
 */
export const PlacaCarousel = ({
    slides,
    slideWidth,
    screenWidth,
    onIndexChange,
}: {
    slides: Slide[];
    slideWidth: number;
    screenWidth: number;
    onIndexChange: (index: number) => void;
}) => {
    const theme = getTheme('dark');
    const current = useRef(0);
    const sidePad = Math.max(0, (screenWidth - slideWidth) / 2);
    const interval = slideWidth + GAP;

    const handleScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            // Rounded against the snap interval rather than tracked per slide:
            // every slide is the same width, so the arithmetic cannot drift.
            const index = Math.round(event.nativeEvent.contentOffset.x / interval);
            const clamped = Math.max(0, Math.min(slides.length - 1, index));
            if (clamped !== current.current) {
                current.current = clamped;
                onIndexChange(clamped);
            }
        },
        [interval, onIndexChange, slides.length],
    );

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={interval}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            overScrollMode="never"
            bounces={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: sidePad, gap: GAP }}
        >
            {slides.map((slide) => (
                <View
                    key={slide.kind}
                    style={[
                        styles.card,
                        {
                            width: slideWidth,
                            height: slideWidth / PLACA_RATIO,
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.background,
                        },
                    ]}
                >
                    {slide.uri ? (
                        <Image
                            source={{ uri: slide.uri }}
                            style={styles.image}
                            resizeMode="cover"
                            accessibilityIgnoresInvertColors
                        />
                    ) : (
                        <View style={styles.placeholder}>
                            <ActivityIndicator color={theme.colors.primary} />
                        </View>
                    )}
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
