import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { palette, getTheme } from '../theme';
import { trackEvent } from '../lib/analytics';
import { spacing, borderRadius, fontSize, fontWeight } from '../theme/tokens';

dayjs.locale('es');

interface Day {
    label: string;
    value: string;
    date: string;
    isToday: boolean;
}

interface Props {
    selectedDate: string;
    onSelectDate: (date: string) => void;
}

export const DaySelector = ({ selectedDate, onSelectDate }: Props) => {
    const theme = getTheme('dark');
    const today = dayjs();

    // Fixed order of days starting from Monday (matching web)
    const daysOfWeek = [
        { label: 'L', dayIndex: 1 }, // Monday
        { label: 'M', dayIndex: 2 }, // Tuesday
        { label: 'X', dayIndex: 3 }, // Wednesday
        { label: 'J', dayIndex: 4 }, // Thursday
        { label: 'V', dayIndex: 5 }, // Friday
        { label: 'S', dayIndex: 6 }, // Saturday
        { label: 'D', dayIndex: 0 }, // Sunday
    ];

    // Calculate dates for the current week (Monday to Sunday)
    const currentDayIndex = today.day(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilMonday = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;
    const mondayOfWeek = today.add(daysUntilMonday, 'day');

    const weekDays: Day[] = daysOfWeek.map((day, index) => {
        const d = mondayOfWeek.add(index, 'day');
        const isToday = d.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');

        return {
            label: day.label,
            value: d.format('YYYY-MM-DD'),
            date: d.format('YYYY-MM-DD'),
            isToday,
        };
    });

    const activeDate = selectedDate || today.format('YYYY-MM-DD');

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {weekDays.map((day) => {
                    const isActive = day.value === activeDate;
                    return (
                        <TouchableOpacity
                            key={day.value}
                            style={[
                                styles.dayButton,
                                isActive && styles.activeDayButton
                            ]}
                            onPress={() => {
                                onSelectDate(day.value);
                                trackEvent('day_change', { action: 'day_change' });
                            }}
                        >
                            <Text style={[styles.dayText, isActive && styles.activeDayText]}>
                                {day.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const theme = getTheme('dark');

const styles = StyleSheet.create({
    container: {
        // Spec: paddingBottom 16, paddingLeft 8 defined in container
        // We put padding in ScrollView content container for horizontal scroll behavior
        marginBottom: 0,
    },
    scrollContent: {
        paddingLeft: spacing.sm, // 8px
        paddingRight: spacing.sm,
        paddingBottom: spacing.md, // 16px
        gap: spacing.sm, // 8px
        flexDirection: 'row',
    },
    dayButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg, // 8px
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.primary,
        backgroundColor: 'transparent',
    },
    activeDayButton: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    dayText: {
        color: theme.colors.textSecondary,
        fontSize: fontSize.sm, // 14px? Spec doesn't strictly say text size but implies standard
        fontWeight: fontWeight.semibold,
    },
    activeDayText: {
        color: '#FFFFFF',
        fontWeight: fontWeight.bold,
    },
});
