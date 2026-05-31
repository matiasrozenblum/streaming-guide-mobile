import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { layout, fontSize, fontWeight } from '../../theme/tokens';
import { getTheme } from '../../theme';

interface Props {
    hourWidth: number;
    totalWidth: number;
    isViewingToday?: boolean;
    isPastDay?: boolean;
}

const TOTAL_HOURS = 28;
const OVERFLOW_START_HOUR = 24;

export const TimeHeaderMarkers = ({ hourWidth, totalWidth, isViewingToday = true, isPastDay = false }: Props) => {
    const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i);
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
            {/* Overflow zone background (00:00–03:59 of next day) */}
            <View style={{
                position: 'absolute',
                left: OVERFLOW_START_HOUR * hourWidth,
                width: 4 * hourWidth,
                top: 0,
                bottom: 0,
                backgroundColor: 'rgba(255,255,255,0.03)',
            }} />

            {/* Dashed border at midnight boundary */}
            <View style={{
                position: 'absolute',
                left: OVERFLOW_START_HOUR * hourWidth,
                top: 0,
                bottom: 0,
                width: 1,
                borderLeftWidth: 1,
                borderLeftColor: 'rgba(255,255,255,0.3)',
                borderStyle: 'dashed',
            }} />

            {hours.map((hour) => {
                const isOverflow = hour >= OVERFLOW_START_HOUR;
                const displayHour = hour % 24; // 24→0, 25→1, 26→2, 27→3
                const isPast = isViewingToday ? displayHour < currentHour && !isOverflow : isPastDay;
                const isCurrent = isViewingToday && displayHour === currentHour && !isOverflow;

                return (
                    <View key={hour} style={[
                        styles.hourMarker,
                        {
                            width: hourWidth,
                            left: hour * hourWidth,
                            borderLeftColor: isOverflow
                                ? 'rgba(255,255,255,0.15)'
                                : theme.colors.border,
                            opacity: isPast ? 0.5 : isOverflow ? 0.6 : 1,
                        }
                    ]}>
                        <Text style={[
                            styles.hourText,
                            {
                                color: isCurrent
                                    ? theme.colors.primary
                                    : isOverflow
                                        ? theme.colors.textSecondary
                                        : theme.colors.textPrimary,
                                fontWeight: isCurrent ? fontWeight.bold : fontWeight.medium,
                            }
                        ]}>
                            {displayHour.toString().padStart(2, '0')}:00
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
