import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Header } from '../components/Header';
import { EmptyRecap } from '../components/recap/EmptyRecap';
import { RecapSignedOut } from '../components/recap/RecapSignedOut';
import { RecapStatusPill } from '../components/recap/RecapStatusPill';
import { recapWaiting } from '../utils/recapSchedule';
import { PeriodSwitch } from '../components/recap/PeriodSwitch';
import { PLACA_RATIO, PlacaCarousel, Slide } from '../components/recap/PlacaCarousel';
import { ShareRow } from '../components/recap/ShareRow';
import { useAuth } from '../context/AuthContext';
import { RecapService } from '../services/recap.service';
import { ShareTarget, sharePlaca } from '../services/placaShare';
import { getTheme } from '../theme';
import {
    canRender,
    PLACA_LABELS,
    PLACA_ORDER,
    PlacaKind,
    Recap,
    RecapPeriod,
} from '../types/recap';
import { trackEvent } from '../lib/analytics';

const MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "26 — 1 de noviembre" for a week, the API's own label for a month. */
function rangeLabel(recap: Recap): string {
    if (recap.period.type !== 'week') return recap.period.label;
    const from = new Date(`${recap.period.from}T12:00:00Z`);
    const to = new Date(`${recap.period.to}T12:00:00Z`);
    return `${from.getUTCDate()} — ${to.getUTCDate()} de ${MONTHS[to.getUTCMonth()]}`;
}

/**
 * What to say once a share has resolved. Cancelling says nothing, because
 * cancelling is a decision. Each one is kept to a single line: the message
 * takes the counter's place rather than adding a row, so the placa above it
 * never resizes to make room for it.
 */
const OUTCOME_MESSAGE: Record<string, string | null> = {
    shared: null,
    cancelled: null,
    saved: 'Guardamos la placa en tu galería.',
    missing: 'No encontramos esa app en tu teléfono.',
    fallback: null,
    error: 'No pudimos compartir la placa. Probá de nuevo.',
};

export const RecapScreen = () => {
    const theme = getTheme('dark');
    const { session } = useAuth();
    const tabBarHeight = useBottomTabBarHeight();
    const { width } = useWindowDimensions();

    const [period, setPeriod] = useState<RecapPeriod>('week');
    const [recap, setRecap] = useState<Recap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [current, setCurrent] = useState(0);
    const [busy, setBusy] = useState<ShareTarget | null>(null);
    /**
     * The spinner lags the work on purpose. Saving a placa takes a few hundred
     * milliseconds, and a spinner that appears and vanishes inside that window
     * reads as a glitch rather than as progress — so it only shows up if the
     * action is still going after a moment.
     */
    const [showBusy, setShowBusy] = useState<ShareTarget | null>(null);

    useEffect(() => {
        if (!busy) {
            setShowBusy(null);
            return;
        }
        const timer = setTimeout(() => setShowBusy(busy), 300);
        return () => clearTimeout(timer);
    }, [busy]);
    /**
     * Everything below the title row, and the block under the carousel inside
     * it, both measured rather than derived from the window: the header, the
     * title row and the tab bar are all different heights on different phones,
     * and a placa sized against a guess either overflows or wastes the room.
     */
    const [available, setAvailable] = useState(0);
    const [belowHeight, setBelowHeight] = useState(0);

    /** Downloaded placas, keyed by period and kind. */
    const [files, setFiles] = useState<Record<string, string>>({});

    const kinds = useMemo<PlacaKind[]>(
        () => (recap ? PLACA_ORDER.filter((kind) => canRender(kind, recap)) : []),
        [recap],
    );

    const accessToken = session?.accessToken;

    /**
     * Keyed on the token as well as the period, because this screen is mounted
     * while the visitor is still being shown the pitch: without the token in
     * the dependencies the request went out unauthenticated, came back 401 and
     * left its error behind, and finishing the sign-up never asked again —
     * somebody who had just created an account was greeted with "no pudimos
     * traer tu resumen" until they left the tab and came back.
     */
    useEffect(() => {
        let cancelled = false;

        // Nothing to ask for yet, and nothing to show: the pitch is what
        // renders in this state.
        if (!accessToken) {
            setRecap(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setCurrent(0);

        RecapService.getMyRecap(period)
            .then((data) => {
                if (!cancelled) setRecap(data);
            })
            .catch(() => {
                if (!cancelled) setError('No pudimos traer tu resumen. Probá de nuevo.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [period, accessToken]);

    /**
     * The placas are downloaded as soon as the recap lands, one at a time.
     *
     * Each is a few hundred kilobytes and the site takes about 0.65s to render
     * one, so firing all four at once buys nothing and spikes the server. By
     * the time anyone has swiped and tapped, they are all on disk — and sharing
     * is then instant rather than a spinner.
     */
    useEffect(() => {
        if (!recap?.enough_data || !accessToken || kinds.length === 0) return;
        let cancelled = false;

        void (async () => {
            for (const kind of kinds) {
                if (cancelled) return;
                const key = `${period}:${recap.period.from}:${recap.period.to}:${kind}`;
                if (files[key]) continue;
                try {
                    const uri = await RecapService.downloadPlaca({
                        period,
                        from: recap.period.from,
                        to: recap.period.to,
                        kind,
                        accessToken,
                    });
                    if (!cancelled) setFiles((prev) => ({ ...prev, [key]: uri }));
                } catch (downloadError) {
                    console.warn('[Recap] could not download a placa', kind, downloadError);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
        // `files` is deliberately out: it changes on every download and would
        // restart the loop. The `files[key]` check inside is only a shortcut.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recap, kinds, period, accessToken]);

    const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (!notice) return;
        noticeTimer.current = setTimeout(() => setNotice(null), 4000);
        return () => {
            if (noticeTimer.current) clearTimeout(noticeTimer.current);
        };
    }, [notice]);

    const slides = useMemo<Slide[]>(
        () =>
            kinds.map((kind) => ({
                kind,
                uri: recap
                    ? (files[
                          `${period}:${recap.period.from}:${recap.period.to}:${kind}`
                      ] ?? null)
                    : null,
            })),
        [kinds, files, period, recap],
    );

    const handleShare = useCallback(
        async (target: ShareTarget) => {
            const slide = slides[current];
            if (!slide?.uri) {
                setNotice('La placa se está generando. Probá de nuevo.');
                return;
            }
            setBusy(target);
            try {
                const { outcome, detail } = await sharePlaca(target, slide.uri);
                if (detail) console.warn('[Recap] share failed', target, detail);
                setNotice(OUTCOME_MESSAGE[outcome] ?? null);
                void trackEvent('recap_share', {
                    target,
                    outcome,
                    kind: slide.kind,
                    period,
                });
            } finally {
                setBusy(null);
            }
        },
        [current, period, slides],
    );

    // Never wider than 74% of the screen — the same proportion the website's
    // mobile layout uses, so the next placa peeks at either side — and never
    // taller than what is left once the caption and the buttons have theirs.
    const slideWidth = Math.min(
        width * 0.74,
        Math.max(0, available - belowHeight) * PLACA_RATIO,
    );

    const body = () => {
        // A visitor has no recap to load: the pitch is the screen.
        if (!session) {
            return <RecapSignedOut />;
        }

        if (loading) {
            return (
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.colors.primary} />
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.centered}>
                    <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                        {error}
                    </Text>
                </View>
            );
        }

        if (recap && !recap.enough_data) {
            return <EmptyRecap recap={recap} />;
        }

        if (slides.length === 0) return null;

        // Laid out top down rather than centred: the caption belongs right
        // under the placa it names, so any space left over goes to the bottom
        // instead of opening a gap between the two.
        return (
            <>
                {slideWidth > 0 && (
                    <PlacaCarousel
                        slides={slides}
                        slideWidth={slideWidth}
                        screenWidth={width}
                        onIndexChange={setCurrent}
                    />
                )}

                <View
                    style={styles.below}
                    onLayout={(event) =>
                        setBelowHeight(event.nativeEvent.layout.height)
                    }
                >
                    <View style={styles.captionBlock}>
                        <Text style={[styles.caption, { color: theme.colors.textPrimary }]}>
                            {PLACA_LABELS[slides[current]?.kind ?? slides[0].kind]}
                        </Text>
                        {/* The feedback line replaces the counter instead of
                            floating over everything: an absolutely positioned
                            toast was being painted under the tab bar, which
                            carries elevation 8 and wins on Android however the
                            siblings are ordered. */}
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.counter,
                                {
                                    color: notice
                                        ? theme.colors.primary
                                        : theme.colors.textSecondary,
                                },
                            ]}
                        >
                            {notice ??
                                `${current + 1} de ${slides.length} · Deslizá para ver más`}
                        </Text>
                    </View>

                    <ShareRow
                        onShare={handleShare}
                        busy={showBusy}
                        disabled={busy !== null}
                    />
                </View>
            </>
        );
    };

    return (
        <SafeAreaView
            edges={['top']}
            style={[
                styles.screen,
                {
                    // The same surface the rest of the app sits on, header
                    // included — the section used to be a shade darker than
                    // everything around it.
                    backgroundColor: theme.colors.background,
                    // The tab bar is absolutely positioned, so without this the
                    // share buttons sit underneath it.
                    paddingBottom: tabBarHeight,
                },
            ]}
        >
            <Header />

            {/* A visitor gets the pitch, not a section header for a recap
                they do not have yet. */}
            {session && <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Mi resumen</Text>
                {/* Nothing to switch between without a recap behind it. */}
                {session && (
                    <PeriodSwitch value={period} onChange={setPeriod} disabled={loading} />
                )}
                {recap && (
                    <Text style={[styles.range, { color: theme.colors.textSecondary }]}>
                        {/* While there is nothing to show, the dates are the
                            ones the next recap will cover: the period the API
                            hands back is the closed one behind us, and printing
                            it under "tu primer resumen llega el viernes" would
                            date the promise to a week already gone. */}
                        {recap.enough_data
                            ? rangeLabel(recap)
                            : recapWaiting(
                                  recap.period.type === 'month' ? 'month' : 'week',
                                  recap.period,
                              ).rangeLabel}
                    </Text>
                )}
            </View>}

            {session && recap?.enough_data && <RecapStatusPill range={recap.period} />}

            <View
                style={styles.body}
                onLayout={(event) => setAvailable(event.nativeEvent.layout.height)}
            >
                {body()}
            </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 14,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'Outfit_700Bold',
    },
    range: {
        fontSize: 14,
    },
    body: {
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 32,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
    },
    below: {
        alignItems: 'center',
        gap: 10,
        paddingTop: 14,
        paddingBottom: 16,
    },
    captionBlock: {
        alignItems: 'center',
        gap: 2,
    },
    caption: {
        fontSize: 17,
        fontWeight: '700',
    },
    counter: {
        fontSize: 13,
    },
});
