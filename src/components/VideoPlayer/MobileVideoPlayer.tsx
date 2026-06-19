import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
    View, StyleSheet, Dimensions, TouchableOpacity, PanResponder,
    Animated, Image, Text, ScrollView, Pressable,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgUri } from 'react-native-svg';
import { useVideoPlayer } from '../../context/VideoPlayerContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trackEvent } from '../../lib/analytics';
import { ZapItem } from '../../types/zap';

// Replicates the ChannelLogo background logic for zap list rows
interface ParsedGradient { colors: string[]; angle: number; }
const parseGradient = (value: string): ParsedGradient | null => {
    if (!value.startsWith('linear-gradient')) return null;
    const match = value.match(/linear-gradient\((.+)\)/);
    if (!match) return null;
    const inner = match[1];
    const angleMatch = inner.match(/^(\d+)deg/);
    const angle = angleMatch ? parseInt(angleMatch[1], 10) : 180;
    const colorMatches = inner.match(/#[0-9a-fA-F]{3,8}/g);
    if (!colorMatches || colorMatches.length < 2) return null;
    return { colors: colorMatches, angle };
};
const angleToPoints = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
        start: { x: 0.5 - Math.cos(rad) * 0.5, y: 0.5 - Math.sin(rad) * 0.5 },
        end:   { x: 0.5 + Math.cos(rad) * 0.5, y: 0.5 + Math.sin(rad) * 0.5 },
    };
};
const sanitizeBgColor = (color?: string | null): string =>
    (!color || color.startsWith('linear-gradient') || color.startsWith('radial-gradient'))
        ? '#FFFFFF'
        : color;

const isSvgUrl = (url: string) => url.split('?')[0].toLowerCase().endsWith('.svg');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINIMIZED_WIDTH = 160;
const MINIMIZED_HEIGHT = 90;
const ROW_HEIGHT = 64;
const TAB_BAR_HEIGHT = 68;

const MODAL_WIDTH = SCREEN_WIDTH * 0.95;
const VIDEO_HEIGHT = MODAL_WIDTH * (9 / 16);
const CONTROLS_HEIGHT = 44;
const MODAL_HEIGHT = VIDEO_HEIGHT + CONTROLS_HEIGHT;
const PLAYER_TOP = (SCREEN_HEIGHT - MODAL_HEIGHT) / 2;
const PLAYER_LEFT = (SCREEN_WIDTH - MODAL_WIDTH) / 2;

type ZapItemWithIdx = ZapItem & { originalIdx: number };

export const MobileVideoPlayer = () => {
    const {
        isVisible, isMinimized, videoUrl, service,
        zapList, zapIndex, zapTo,
        closeVideo, minimizeVideo, maximizeVideo,
    } = useVideoPlayer();

    const [embedUrl, setEmbedUrl] = useState<string | null>(null);
    const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
    const [youtubePlaylistId, setYoutubePlaylistId] = useState<string | null>(null);
    const insets = useSafeAreaInsets();
    const topCardRef = useRef<ScrollView>(null);
    const [zapExpanded, setZapExpanded] = useState(false);
    const zapAnim = useRef(new Animated.Value(0)).current;

    // Channels before the current one that have content (split first, then filter)
    const channelsAbove = useMemo((): ZapItemWithIdx[] =>
        zapList
            .slice(0, zapIndex)
            .map((item, i) => ({ ...item, originalIdx: i }))
            .filter(item => item.videoUrl !== null),
        [zapList, zapIndex]
    );

    // Channels after the current one that have content
    const channelsBelow = useMemo((): ZapItemWithIdx[] =>
        zapList
            .slice(zapIndex + 1)
            .map((item, i) => ({ ...item, originalIdx: zapIndex + 1 + i }))
            .filter(item => item.videoUrl !== null),
        [zapList, zapIndex]
    );

    // Scroll top card to bottom when current channel or list changes
    useEffect(() => {
        if (!isMinimized && channelsAbove.length > 0) {
            const timer = setTimeout(() => {
                topCardRef.current?.scrollToEnd({ animated: true });
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [zapIndex, isMinimized, channelsAbove.length]);

    const toggleZapList = useCallback(() => {
        const expanding = !zapExpanded;
        setZapExpanded(expanding);
        Animated.timing(zapAnim, {
            toValue: expanding ? 1 : 0,
            duration: 280,
            useNativeDriver: true,
        }).start(() => {
            if (expanding) topCardRef.current?.scrollToEnd({ animated: false });
        });
    }, [zapExpanded, zapAnim]);

    // Collapse list when player is minimized
    useEffect(() => {
        if (isMinimized) {
            setZapExpanded(false);
            Animated.timing(zapAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
    }, [isMinimized]);

    useEffect(() => {
        if (isVisible && videoUrl) {
            if (service === 'youtube') {
                if (videoUrl.includes('list=')) {
                    const listMatch = videoUrl.match(/[?&]list=([^&]+)/);
                    if (listMatch) {
                        setYoutubePlaylistId(listMatch[1]);
                        setYoutubeVideoId(null);
                        setEmbedUrl(null);
                    }
                } else {
                    let videoId = videoUrl;
                    if (videoUrl.includes('/embed/')) {
                        const match = videoUrl.match(/\/embed\/([^?&]+)/);
                        videoId = match ? match[1] : videoUrl;
                    } else if (videoUrl.includes('v=')) {
                        videoId = videoUrl.split('v=')[1].split('&')[0];
                    } else if (videoUrl.includes('youtu.be/')) {
                        videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                    }
                    setYoutubeVideoId(videoId);
                    setYoutubePlaylistId(null);
                    setEmbedUrl(null);
                }
            } else if (service === 'twitch') {
                const channel = videoUrl.includes('twitch.tv/') ? videoUrl.split('twitch.tv/')[1] : videoUrl;
                setEmbedUrl(`https://player.twitch.tv/?channel=${channel}&parent=streamuguide.com&autoplay=true`);
                setYoutubeVideoId(null);
                setYoutubePlaylistId(null);
            } else if (service === 'kick') {
                const channel = videoUrl.includes('kick.com/') ? videoUrl.split('kick.com/')[1] : videoUrl;
                setEmbedUrl(`https://player.kick.com/${channel}?autoplay=true`);
                setYoutubeVideoId(null);
                setYoutubePlaylistId(null);
            }
        } else {
            setEmbedUrl(null);
            setYoutubeVideoId(null);
            setYoutubePlaylistId(null);
        }
    }, [isVisible, videoUrl, service]);

    // PanResponder for dragging the minimized player
    const pan = useRef(new Animated.ValueXY()).current;
    const isMinimizedRef = useRef(isMinimized);
    isMinimizedRef.current = isMinimized;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => isMinimizedRef.current,
            onMoveShouldSetPanResponder: () => isMinimizedRef.current,
            onPanResponderGrant: () => {
                pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: () => { pan.flattenOffset(); },
        })
    ).current;

    useEffect(() => {
        if (isMinimized) {
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
    }, [isMinimized]);

    const [playing, setPlaying] = useState(true);
    const [playerKey, setPlayerKey] = useState(0);

    const remountPlayer = useCallback(() => {
        setPlayerKey(k => k + 1);
        setPlaying(true);
    }, []);

    useEffect(() => {
        setPlaying(true);
        setPlayerKey(0);
    }, [youtubeVideoId, youtubePlaylistId]);

    if (!isVisible || (!embedUrl && !youtubeVideoId && !youtubePlaylistId)) return null;

    const hasZap = !isMinimized && (channelsAbove.length > 0 || channelsBelow.length > 0);
    const currentItem: ZapItem | undefined = zapList[zapIndex];

    const VISIBLE_ROWS = 2;
    // Cards are exactly as tall as their content (max VISIBLE_ROWS), flush against the player
    const topCardHeight = Math.min(channelsAbove.length, VISIBLE_ROWS) * ROW_HEIGHT;
    const bottomCardHeight = Math.min(channelsBelow.length, VISIBLE_ROWS) * ROW_HEIGHT;

    // translateY from outside-player to 0 — no height animation avoids ScrollView bounce
    const topTranslateAnim = zapAnim.interpolate({ inputRange: [0, 1], outputRange: [-topCardHeight, 0] });
    const bottomTranslateAnim = zapAnim.interpolate({ inputRange: [0, 1], outputRange: [bottomCardHeight, 0] });

    const renderRow = (item: ZapItemWithIdx) => {
        const isStreamer = item.kind === 'streamer';
        const gradient = item.backgroundColor ? parseGradient(item.backgroundColor) : null;
        const bgColor = sanitizeBgColor(item.backgroundColor);
        const pts = gradient ? angleToPoints(gradient.angle) : null;
        const logoStyle = isStreamer ? styles.rowLogoSquare : styles.rowLogo;

        const logoInner = item.logoUrl ? (
            isSvgUrl(item.logoUrl) ? (
                <SvgUri uri={item.logoUrl} width="100%" height="100%" />
            ) : (
                <Image
                    source={{ uri: item.logoUrl, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile; rv:88.0) Gecko/88.0 Firefox/88.0' } }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={isStreamer ? 'cover' : 'contain'}
                />
            )
        ) : (
            <Text style={styles.rowLogoText}>{item.name.charAt(0)}</Text>
        );

        const logoEl = pts ? (
            <LinearGradient
                colors={gradient!.colors as [string, string, ...string[]]}
                start={pts.start}
                end={pts.end}
                style={logoStyle}
            >
                {logoInner}
            </LinearGradient>
        ) : (
            <View style={[logoStyle, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
                {logoInner}
            </View>
        );

        return (
            <Pressable
                key={item.id}
                style={[styles.channelRow, item.isLive && styles.channelRowLive]}
                onPress={() => {
                    zapTo(item.originalIdx);
                    trackEvent('zap_channel', {
                        direction: item.originalIdx < zapIndex ? 'previous' : 'next',
                        service,
                        target_channel: item.name,
                    });
                }}
            >
                {({ pressed }) => (
                    <>
                        {pressed && <View style={styles.rowPressOverlay} pointerEvents="none" />}
                        {logoEl}
                        <View style={styles.rowTextBlock}>
                            <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                            {item.programName && (
                                <Text style={styles.rowProgram} numberOfLines={1}>{item.programName}</Text>
                            )}
                        </View>
                        {item.isLive && <Text style={styles.rowLive}>● EN VIVO</Text>}
                    </>
                )}
            </Pressable>
        );
    };

    return (
        <>
            {/* Full-screen dark overlay */}
            {!isMinimized && (
                <View style={styles.overlay} pointerEvents="box-none">
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeVideo} />

                    {/* Top card: clip container anchored at player's top, card slides up/down inside */}
                    {hasZap && channelsAbove.length > 0 && (
                        <View style={{
                            position: 'absolute',
                            bottom: SCREEN_HEIGHT - PLAYER_TOP,
                            left: PLAYER_LEFT,
                            width: MODAL_WIDTH,
                            height: topCardHeight,
                            overflow: 'hidden',
                        }}>
                            <Animated.View
                                pointerEvents={zapExpanded ? 'auto' : 'none'}
                                style={[styles.zapCard, styles.zapCardTop, {
                                    width: '100%',
                                    height: topCardHeight,
                                    transform: [{ translateY: topTranslateAnim }],
                                }]}
                            >
                                <ScrollView
                                    ref={topCardRef}
                                    bounces={false}
                                    showsVerticalScrollIndicator={false}
                                    onContentSizeChange={() =>
                                        topCardRef.current?.scrollToEnd({ animated: false })
                                    }
                                >
                                    {channelsAbove.map(item => renderRow(item))}
                                </ScrollView>
                            </Animated.View>
                        </View>
                    )}

                    {/* Bottom card: clip container anchored at player's bottom, card slides down/up inside */}
                    {hasZap && channelsBelow.length > 0 && (
                        <View style={{
                            position: 'absolute',
                            top: PLAYER_TOP + MODAL_HEIGHT,
                            left: PLAYER_LEFT,
                            width: MODAL_WIDTH,
                            height: bottomCardHeight,
                            overflow: 'hidden',
                        }}>
                            <Animated.View
                                pointerEvents={zapExpanded ? 'auto' : 'none'}
                                style={[styles.zapCard, styles.zapCardBottom, {
                                    width: '100%',
                                    height: bottomCardHeight,
                                    transform: [{ translateY: bottomTranslateAnim }],
                                }]}
                            >
                                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                                    {channelsBelow.map(item => renderRow(item))}
                                </ScrollView>
                            </Animated.View>
                        </View>
                    )}
                </View>
            )}

            {/* Player (always floating on top) */}
            <Animated.View
                style={[
                    isMinimized ? {
                        position: 'absolute',
                        width: MINIMIZED_WIDTH,
                        height: MINIMIZED_HEIGHT,
                        bottom: insets.bottom + 60,
                        right: 16,
                        transform: pan.getTranslateTransform(),
                        zIndex: 10000,
                        borderRadius: 8,
                        overflow: 'hidden',
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                    } : {
                        position: 'absolute',
                        width: MODAL_WIDTH,
                        height: MODAL_HEIGHT,
                        top: PLAYER_TOP,
                        left: PLAYER_LEFT,
                        zIndex: 10000,
                        backgroundColor: '#1E293B',
                        borderTopLeftRadius: (hasZap && channelsAbove.length > 0) ? 0 : 12,
                        borderTopRightRadius: (hasZap && channelsAbove.length > 0) ? 0 : 12,
                        borderBottomLeftRadius: (hasZap && channelsBelow.length > 0) ? 0 : 12,
                        borderBottomRightRadius: (hasZap && channelsBelow.length > 0) ? 0 : 12,
                        padding: 8,
                        elevation: 24,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                    }
                ]}
                {...(isMinimized ? panResponder.panHandlers : {})}
            >
                {/* Controls: zap toggle (far left) + channel info + min/close (right) */}
                <View style={styles.controlsRow}>
                    {hasZap && (channelsAbove.length > 0 || channelsBelow.length > 0) && (
                        <IconButton
                            icon="format-list-bulleted"
                            iconColor={zapExpanded ? '#3b82f6' : 'rgba(255,255,255,0.65)'}
                            size={18}
                            onPress={toggleZapList}
                            style={styles.controlButton}
                        />
                    )}
                    {hasZap && currentItem ? (
                        <View style={styles.channelInfo}>
                            {currentItem.logoUrl ? (() => {
                                const isStreamer = currentItem.kind === 'streamer';
                                const logoStyle = isStreamer ? styles.channelInfoLogoSquare : styles.channelInfoLogo;
                                const gradient = currentItem.backgroundColor ? parseGradient(currentItem.backgroundColor) : null;
                                const bgColor = sanitizeBgColor(currentItem.backgroundColor);
                                const pts = gradient ? angleToPoints(gradient.angle) : null;
                                const img = isSvgUrl(currentItem.logoUrl!)
                                    ? <SvgUri uri={currentItem.logoUrl!} width="100%" height="100%" />
                                    : <Image source={{ uri: currentItem.logoUrl!, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile; rv:88.0) Gecko/88.0 Firefox/88.0' } }} style={{ width: '100%', height: '100%' }} resizeMode={isStreamer ? 'cover' : 'contain'} />;
                                return pts ? (
                                    <LinearGradient colors={gradient!.colors as [string, string, ...string[]]} start={pts.start} end={pts.end} style={logoStyle}>{img}</LinearGradient>
                                ) : (
                                    <View style={[logoStyle, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>{img}</View>
                                );
                            })() : null}
                            <Text style={styles.channelInfoName} numberOfLines={1}>{currentItem.name}</Text>
                        </View>
                    ) : (
                        <View style={{ flex: 1 }} />
                    )}
                    <View style={styles.controlsRight}>
                        <IconButton
                            icon={isMinimized ? 'window-maximize' : 'window-minimize'}
                            iconColor="white"
                            size={isMinimized ? 16 : 20}
                            onPress={() => {
                                if (isMinimized) {
                                    maximizeVideo();
                                    trackEvent('maximize_youtube', { service, video_url: videoUrl });
                                } else {
                                    minimizeVideo();
                                    trackEvent('minimize_youtube', { service, video_url: videoUrl });
                                }
                            }}
                            style={styles.controlButton}
                        />
                        <IconButton
                            icon="close"
                            iconColor="white"
                            size={isMinimized ? 16 : 20}
                            onPress={closeVideo}
                            style={styles.controlButton}
                        />
                    </View>
                </View>

                {isMinimized && (
                    <TouchableOpacity
                        onPress={() => { maximizeVideo(); trackEvent('maximize_youtube', { service, video_url: videoUrl }); }}
                        style={styles.minimizedTouchArea}
                        activeOpacity={0.9}
                    />
                )}

                <View style={styles.webviewContainer}>
                    {(youtubeVideoId || youtubePlaylistId) ? (
                        <YoutubePlayer
                            key={playerKey}
                            height={isMinimized ? MINIMIZED_HEIGHT - 30 : VIDEO_HEIGHT}
                            play={playing}
                            videoId={youtubeVideoId || undefined}
                            playList={youtubePlaylistId || undefined}
                            onError={(error: string) => {
                                console.error('[VideoPlayer] YouTube error:', error);
                                setTimeout(remountPlayer, 1500);
                            }}
                            onReady={() => console.log('[VideoPlayer] YouTube player ready')}
                            onChangeState={(state: string) => { if (state === 'ended') setPlaying(false); }}
                            webViewProps={{
                                // Do NOT use androidLayerType: 'hardware' — Android recycles
                                // hardware compositor layers after ~3 min of low interaction,
                                // causing the classic "freeze then blank" bug on live streams.
                                mediaPlaybackRequiresUserAction: false,
                                allowsInlineMediaPlayback: true,
                                onRenderProcessGone: () => {
                                    console.warn('[VideoPlayer] Android WebView renderer gone, remounting');
                                    remountPlayer();
                                },
                                onContentProcessDidTerminate: () => {
                                    console.warn('[VideoPlayer] iOS WKWebView process terminated, remounting');
                                    remountPlayer();
                                },
                            }}
                        />
                    ) : embedUrl ? (
                        <WebView
                            source={{ uri: embedUrl }}
                            style={{ flex: 1, borderRadius: 8 }}
                            allowsInlineMediaPlayback={true}
                            allowsFullscreenVideo={true}
                            mediaPlaybackRequiresUserAction={false}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            originWhitelist={['*']}
                            onError={(e) => console.error('[VideoPlayer] WebView error:', e.nativeEvent)}
                        />
                    ) : null}
                </View>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 9999,
    },
    // Two opaque cards flanking the player (one above, one below)
    zapCard: {
        position: 'absolute',
        backgroundColor: '#1E293B',
        overflow: 'hidden',
        elevation: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    // Top card: rounded at the top, flat at the bottom (flush with player)
    zapCardTop: {
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    // Bottom card: flat at the top (flush with player), rounded at the bottom
    zapCardBottom: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
    },
    channelRow: {
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        marginHorizontal: 6,
        marginVertical: 2,
        borderRadius: 10,
    },
    channelRowLive: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    // Uniform darkening overlay on top of the whole row (logo included) for press feedback —
    // avoids the seam that activeOpacity causes against the logo's solid background fill
    rowPressOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderRadius: 10,
    },
rowLogo: {
        width: 72,
        height: 36,
        borderRadius: 6,
        overflow: 'hidden',
    },
    // Streamer logos are square (1:1), matching StreamerCard's imageSection ratio
    rowLogoSquare: {
        width: 36,
        height: 36,
        borderRadius: 6,
        overflow: 'hidden',
    },
    rowLogoPlaceholder: {
        width: 72,
        height: 36,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowLogoText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    rowTextBlock: {
        flex: 1,
        justifyContent: 'center',
        gap: 3,
    },
    rowName: {
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: '600',
    },
    rowProgram: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '400',
    },
    rowLive: {
        color: '#F44336',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    // Player controls
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
        zIndex: 10,
        minHeight: 36,
    },
    channelInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 4,
        paddingRight: 8,
        overflow: 'hidden',
    },
    channelInfoLogo: {
        width: 44,
        height: 22,
        borderRadius: 4,
        overflow: 'hidden',
    },
    channelInfoLogoSquare: {
        width: 22,
        height: 22,
        borderRadius: 4,
        overflow: 'hidden',
    },
    channelInfoName: {
        flex: 1,
        color: '#f1f5f9',
        fontSize: 12,
        fontWeight: '600',
    },
    channelInfoLive: {
        color: '#F44336',
        fontSize: 10,
        fontWeight: '700',
    },
    controlsRight: {
        flexDirection: 'row',
        gap: 2,
    },
    controlButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        margin: 0,
    },
    webviewContainer: {
        flex: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },
    minimizedTouchArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 5,
    },
});
