import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Category } from '../types/channel';
import { getTheme } from '../theme';
import { layout } from '../theme/tokens';

interface Props {
    categories: Category[];
    selectedCategory: Category | null;
    onSelectCategory: (category: Category | null) => void;
}

const TAB_WIDTH = layout.PIXELS_PER_MINUTE * 60; // 120px — matches hour block width
const FIRST_TAB_WIDTH = layout.CHANNEL_LABEL_WIDTH_MOBILE; // 122px — matches channel label

export const CategorySelector = ({ categories, selectedCategory, onSelectCategory }: Props) => {
    const theme = getTheme('dark');
    const scrollRef = useRef<ScrollView>(null);

    // Scroll to keep selected tab visible
    useEffect(() => {
        if (!selectedCategory) {
            scrollRef.current?.scrollTo({ x: 0, animated: true });
            return;
        }
        const index = categories.findIndex(c => c.id === selectedCategory.id);
        if (index >= 0) {
            const offset = FIRST_TAB_WIDTH + index * TAB_WIDTH;
            scrollRef.current?.scrollTo({ x: Math.max(offset - 60, 0), animated: true });
        }
    }, [selectedCategory, categories]);

    const getActiveColor = (category: Category | null) => {
        if (category === null) return theme.colors.primary;
        return category.color || theme.colors.primary;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* "Todos" tab */}
                <TouchableOpacity
                    style={[styles.tab, { width: FIRST_TAB_WIDTH }]}
                    onPress={() => onSelectCategory(null)}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.tabText,
                            {
                                color: selectedCategory === null ? getActiveColor(null) : theme.colors.textSecondary,
                                fontWeight: selectedCategory === null ? '600' : '500',
                            },
                        ]}
                        numberOfLines={1}
                    >
                        Todos
                    </Text>
                    {selectedCategory === null && (
                        <View style={[styles.indicator, { backgroundColor: getActiveColor(null) }]} />
                    )}
                </TouchableOpacity>

                {/* Category tabs */}
                {categories.map((category) => {
                    const active = selectedCategory?.id === category.id;
                    return (
                        <TouchableOpacity
                            key={category.id}
                            style={[styles.tab, { width: TAB_WIDTH }]}
                            onPress={() => onSelectCategory(category)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    {
                                        color: active ? getActiveColor(category) : theme.colors.textSecondary,
                                        fontWeight: active ? '600' : '500',
                                    },
                                ]}
                                numberOfLines={1}
                            >
                                {category.name}
                            </Text>
                            {active && (
                                <View style={[styles.indicator, { backgroundColor: getActiveColor(category) }]} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderBottomWidth: 1,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    scrollContent: {
        flexDirection: 'row',
    },
    tab: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    tabText: {
        fontSize: 14,
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },
});
