import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { getTheme } from '../../theme';
import { navigate } from '../../navigation/NavigationService';
import { Recap } from '../../types/recap';

/**
 * The placeholder's drawn size. It is capped there and shrinks from it when the
 * screen is short, keeping the placa's proportion — the contents are centred
 * inside, so giving it less height alone would clip them instead of scaling.
 */
const SKELETON_WIDTH = 190;
const SKELETON_HEIGHT = 338;

/** One cell of the two grid rows at the foot of the placeholder. */
function Cell({ on = false }: { on?: boolean }) {
    return <View style={[styles.cell, on && styles.cellOn]} />;
}

/**
 * A placa with nothing in it yet: the shape the person is working towards.
 *
 * The dashed outline is drawn in SVG rather than with `borderStyle: 'dashed'`,
 * which Android silently renders as a solid line as soon as the view has a
 * corner radius.
 */
function PlacaSkeleton() {
    // The outline is drawn against measured pixels rather than percentages:
    // a percentage-sized rect inside an absolutely positioned Svg resolved
    // wider and taller than the view, so its right and bottom edges fell
    // outside and never got painted.
    const [size, setSize] = useState({ width: 0, height: 0 });
    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) =>
            current.width === width && current.height === height
                ? current
                : { width, height },
        );
    };

    return (
        <View style={styles.skeleton} onLayout={onLayout}>
            {size.width > 0 && (
                <Svg
                    style={StyleSheet.absoluteFill}
                    width={size.width}
                    height={size.height}
                >
                    {/* The stroke straddles the edge, so the rect is inset by
                        half of it to keep the whole line inside the view. */}
                    <Rect
                        x={1}
                        y={1}
                        width={size.width - 2}
                        height={size.height - 2}
                        rx={16}
                        ry={16}
                        fill="rgba(30, 41, 59, 0.45)"
                        stroke="#475569"
                        strokeWidth={2}
                        strokeDasharray="8 7"
                    />
                </Svg>
            )}

            <View style={styles.skeletonInner}>
                <View style={[styles.bar, { width: '58%' }]} />
                <View style={[styles.bar, { width: '42%' }]} />
                <View style={styles.block} />
                <View style={[styles.cellRow, { marginTop: 10 }]}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <Cell key={i} on={i === 2} />
                    ))}
                </View>
                <View style={styles.cellRow}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <Cell key={i} />
                    ))}
                </View>
            </View>
        </View>
    );
}

/**
 * What most people see at first: the recap needs a handful of plays before it
 * says anything worth sharing. The bar turns the gate into progress instead of
 * a dead end, and the target comes from the API so it cannot drift from the
 * rule that actually withholds the recap.
 */
export const EmptyRecap = ({ recap }: { recap: Recap }) => {
    const theme = getTheme('dark');
    const done = recap.totals.plays;
    const target = Math.max(recap.minimum_plays, 1);
    const pct = Math.min(100, Math.round((done / target) * 100));

    return (
        <View style={styles.root}>
            <PlacaSkeleton />

            <View style={styles.copy}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                    Estamos armando tu resumen
                </Text>
                <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                    Para construirlo necesitamos que sigas mirando programas y streamers
                    en La Guía. Con unas pocas reproducciones más, tu resumen aparece acá.
                </Text>
            </View>

            <View style={styles.progress}>
                <View style={styles.progressLabels}>
                    <Text style={[styles.progressLabel, { color: theme.colors.textPrimary }]}>
                        Vas {done} de {target}{' '}
                        {target === 1 ? 'reproducción' : 'reproducciones'}
                    </Text>
                    <Text style={styles.progressTarget}>Meta: {target}</Text>
                </View>
                <View
                    style={styles.track}
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: target, now: done }}
                >
                    <View
                        style={[
                            styles.fill,
                            { width: `${pct}%`, backgroundColor: theme.colors.primary },
                        ]}
                    />
                </View>
            </View>

            <Pressable
                onPress={() => navigate('MainTabs', { screen: 'Canales' })}
                accessibilityRole="button"
                style={({ pressed }) => [
                    styles.cta,
                    { backgroundColor: theme.colors.primary },
                    pressed && styles.ctaPressed,
                ]}
            >
                <Text style={styles.ctaLabel}>Ver qué hay en vivo</Text>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 32,
        paddingTop: 18,
        paddingBottom: 8,
    },
    skeleton: {
        // Takes whatever height the copy below has not claimed, never more than
        // the drawn size and never so little that it stops reading as a placa.
        flex: 1,
        maxHeight: SKELETON_HEIGHT,
        minHeight: 180,
        aspectRatio: SKELETON_WIDTH / SKELETON_HEIGHT,
    },
    skeletonInner: {
        flex: 1,
        justifyContent: 'center',
        gap: 12,
        padding: 22,
    },
    bar: {
        height: 10,
        borderRadius: 5,
        backgroundColor: '#334155',
    },
    block: {
        width: '92%',
        height: 46,
        borderRadius: 8,
        backgroundColor: '#334155',
        marginTop: 8,
    },
    cellRow: {
        flexDirection: 'row',
        gap: 5,
    },
    cell: {
        width: 18,
        height: 18,
        borderRadius: 4,
        backgroundColor: '#1B2435',
    },
    cellOn: {
        backgroundColor: '#3B82F6',
    },
    copy: {
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 21,
        lineHeight: 26,
        letterSpacing: -0.42,
        textAlign: 'center',
    },
    body: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
    },
    progress: {
        width: '100%',
        gap: 8,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    progressLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        lineHeight: 16,
    },
    progressTarget: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        lineHeight: 16,
        color: '#94A3B8',
    },
    track: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#1E293B',
        overflow: 'hidden',
    },
    fill: {
        height: 8,
        borderRadius: 4,
    },
    cta: {
        width: '100%',
        height: 48,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaPressed: {
        opacity: 0.88,
    },
    ctaLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15,
        lineHeight: 18,
        color: '#FFFFFF',
    },
});
