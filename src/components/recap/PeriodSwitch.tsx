import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getTheme } from '../../theme';
import { RecapPeriod } from '../../types/recap';

const OPTIONS: Array<{ id: RecapPeriod; label: string }> = [
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
];

export const PeriodSwitch = ({
    value,
    onChange,
    disabled,
}: {
    value: RecapPeriod;
    onChange: (next: RecapPeriod) => void;
    disabled?: boolean;
}) => {
    const theme = getTheme('dark');

    return (
        <View style={[styles.track, { backgroundColor: theme.colors.background }]}>
            {OPTIONS.map((option) => {
                const selected = option.id === value;
                return (
                    <TouchableOpacity
                        key={option.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={disabled}
                        onPress={() => onChange(option.id)}
                        style={[
                            styles.option,
                            selected && { backgroundColor: theme.colors.primary },
                        ]}
                    >
                        <Text
                            style={[
                                styles.label,
                                {
                                    color: selected ? '#FFFFFF' : theme.colors.textSecondary,
                                    fontWeight: selected ? '600' : '500',
                                },
                            ]}
                        >
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    track: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 3,
        borderRadius: 999,
    },
    option: {
        paddingHorizontal: 18,
        paddingVertical: 6,
        borderRadius: 999,
    },
    label: {
        fontSize: 14,
    },
});
