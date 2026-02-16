import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { layout, fontSize, fontWeight } from '../../theme/tokens';
import { getTheme } from '../../theme';

interface Props {
    hourWidth: number;
    totalWidth: number;
}

export const TimeHeaderMarkers = ({ hourWidth, totalWidth }: Props) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const theme = getTheme('dark');

    return (
        <View style={[styles.container, { width: totalWidth }]}>
            {hours.map((hour) => (
                <View key={hour} style={[
                    styles.hourMarker,
                    {
                        width: hourWidth,
                        left: hour * hourWidth,
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
        height: layout.TIME_HEADER_HEIGHT,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.12)',
        backgroundColor: '#1E293B',
        flexDirection: 'row',
        alignItems: 'center',
    },
    hourMarker: {
        position: 'absolute',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
    },
    hourText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
    }
});
