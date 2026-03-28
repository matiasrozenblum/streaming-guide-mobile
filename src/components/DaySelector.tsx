import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import { getTheme } from '../theme';
import { trackEvent } from '../lib/analytics';
import { spacing, borderRadius, fontSize, fontWeight } from '../theme/tokens';

dayjs.locale('es');

interface Day {
    label: string;
    value: string; // English day name ('monday', 'friday', etc.)
}

// Static week definition — labels + backend day_of_week values, Mon–Sun order
const WEEK_DAYS: Day[] = [
    { label: 'L', value: 'monday' },
    { label: 'M', value: 'tuesday' },
    { label: 'X', value: 'wednesday' },
    { label: 'J', value: 'thursday' },
    { label: 'V', value: 'friday' },
    { label: 'S', value: 'saturday' },
    { label: 'D', value: 'sunday' },
];

interface Props {
    selectedDate: string; // English day name or '' for today
    onSelectDate: (date: string) => void;
}

export const DaySelector = ({ selectedDate, onSelectDate }: Props) => {
    const todayName = dayjs().locale('en').format('dddd').toLowerCase();
    const activeDate = selectedDate || todayName;

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {WEEK_DAYS.map((day) => {
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
