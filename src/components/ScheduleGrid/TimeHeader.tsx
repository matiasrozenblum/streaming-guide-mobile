import React, { useState, useEffect } from 'react';
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
    const [currentHour, setCurrentHour] = useState(new Date().getHours());

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentHour(new Date().getHours());
        }, 60000);
        return () => clearInterval(intervalId);
    }, []);

    return (
        <View style={[styles.container, { width: totalWidth }]}>
            {hours.map((hour) => {
                const isPast = hour < currentHour;
                const isCurrent = hour === currentHour;

                return (
                    <View key={hour} style={[
                        styles.hourMarker,
                        {
                            width: hourWidth,
                            left: hour * hourWidth,
                            borderLeftColor: theme.colors.border,
                            opacity: isPast ? 0.5 : 1,
                        }
                    ]}>
                        <Text style={[
                            styles.hourText,
                            {
                                color: isCurrent ? theme.colors.primary : theme.colors.textPrimary,
                                fontWeight: isCurrent ? fontWeight.bold : fontWeight.medium,
                            }
                        ]}>
                            {hour.toString().padStart(2, '0')}:00
                        </Text>
                    </View>
                );
            })}
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
        fontSize: fontSize.sm,
    }
});
