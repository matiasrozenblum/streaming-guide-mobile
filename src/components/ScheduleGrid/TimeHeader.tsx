import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { layout, fontSize, fontWeight } from '../../theme/tokens';
import { getTheme } from '../../theme';

interface Props {
    width: number;
    hourWidth: number;
    scrollX: Animated.Value;
}

export const TimeHeader = ({ width, hourWidth, scrollX }: Props) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const theme = getTheme('dark');

    return (
        <View style={styles.container}>
            {/* Sticky "Canal" Header */}
            <Animated.View
                style={[
                    styles.spacer,
                    {
                        transform: [{ translateX: scrollX }],
                        backgroundColor: theme.colors.background,
                        borderRightColor: theme.colors.border,
                        borderBottomColor: theme.colors.border
                    }
                ]}
            >
                <Text style={[styles.canalText, { color: theme.colors.textSecondary }]}>CANAL</Text>
            </Animated.View>

            {hours.map((hour) => (
                <View key={hour} style={[
                    styles.hourMarker,
                    {
                        width: hourWidth,
                        left: (hour * hourWidth) + layout.CHANNEL_LABEL_WIDTH_MOBILE,
                        borderLeftColor: theme.colors.border
                    }
                ]}>
                    <Text style={[styles.hourText, { color: theme.colors.textSecondary }]}>
                        {hour.toString().padStart(2, '0')}:00
                    </Text>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: layout.TIME_HEADER_HEIGHT, // 40px
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.12)', // theme.border
        backgroundColor: '#1E293B', // theme.background
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 20,
    },
    spacer: {
        width: layout.CHANNEL_LABEL_WIDTH_MOBILE, // 122px
        height: '100%',
        borderRightWidth: 1,
        zIndex: 20,
        position: 'absolute',
        left: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    canalText: {
        fontWeight: fontWeight.bold,
        fontSize: fontSize.xs,
    },
    hourMarker: {
        position: 'absolute',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
    },
    hourText: {
        fontSize: fontSize.xs, // 12px
        fontWeight: fontWeight.medium,
    }
});
