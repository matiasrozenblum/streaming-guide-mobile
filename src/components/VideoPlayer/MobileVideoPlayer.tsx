import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, PanResponder, Animated } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { IconButton } from 'react-native-paper';
import { useVideoPlayer } from '../../context/VideoPlayerContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINIMIZED_WIDTH = 160;
const MINIMIZED_HEIGHT = 90; // 16:9 aspect ratio

export const MobileVideoPlayer = () => {
    const { isVisible, isMinimized, videoUrl, service, closeVideo, minimizeVideo, maximizeVideo } = useVideoPlayer();
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);
    const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
    const [youtubePlaylistId, setYoutubePlaylistId] = useState<string | null>(null);
    const insets = useSafeAreaInsets();

    // Animation/Pan values
    const pan = useRef(new Animated.ValueXY()).current;
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (isVisible && videoUrl) {
            if (service === 'youtube') {
                // Check if it's a playlist
                if (videoUrl.includes('list=')) {
                    const listMatch = videoUrl.match(/[?&]list=([^&]+)/);
                    if (listMatch) {
                        console.log('[VideoPlayer] Loading YouTube playlist:', listMatch[1]);
                        setYoutubePlaylistId(listMatch[1]);
                        setYoutubeVideoId(null);
                        setEmbedUrl(null);
                    }
                } else {
                    // Regular video - extract video ID
                    let videoId = videoUrl;
                    if (videoUrl.includes('/embed/')) {
                        const match = videoUrl.match(/\/embed\/([^?&]+)/);
                        videoId = match ? match[1] : videoUrl;
                    } else if (videoUrl.includes('v=')) {
                        videoId = videoUrl.split('v=')[1].split('&')[0];
                    } else if (videoUrl.includes('youtu.be/')) {
                        videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                    }
                    console.log('[VideoPlayer] Loading YouTube video:', videoId);
                    setYoutubeVideoId(videoId);
                    setYoutubePlaylistId(null);
                    setEmbedUrl(null);
                }
            } else if (service === 'twitch') {
                const channel = videoUrl.includes('twitch.tv/') ? videoUrl.split('twitch.tv/')[1] : videoUrl;
                const url = `https://player.twitch.tv/?channel=${channel}&parent=streamuguide.com&autoplay=true`;
                console.log('[VideoPlayer] Loading Twitch:', url);
                setEmbedUrl(url);
                setYoutubeVideoId(null);
                setYoutubePlaylistId(null);
            } else if (service === 'kick') {
                const channel = videoUrl.includes('kick.com/') ? videoUrl.split('kick.com/')[1] : videoUrl;
                const url = `https://player.kick.com/${channel}?autoplay=true`;
                console.log('[VideoPlayer] Loading Kick:', url);
                setEmbedUrl(url);
                setYoutubeVideoId(null);
                setYoutubePlaylistId(null);
            }
        } else {
            setEmbedUrl(null);
            setYoutubeVideoId(null);
            setYoutubePlaylistId(null);
        }
    }, [isVisible, videoUrl, service]);

    // PanResponder for dragging when minimized
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => isMinimized,
            onMoveShouldSetPanResponder: () => isMinimized,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value
                });
                pan.setValue({ x: 0, y: 0 });
                setIsDragging(true);
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();
                setIsDragging(false);
            }
        })
    ).current;

    // Reset pan position when minimizing
    useEffect(() => {
        if (isMinimized) {
            // Default position: Bottom Right
            Animated.spring(pan, {
                toValue: { x: 0, y: 0 }, // Relative to its container or initial position? 
                // We'll use absolute positioning logic in render
                useNativeDriver: false
            }).start();
        }
    }, [isMinimized]);

    const [playing, setPlaying] = useState(true);

    useEffect(() => {
        // Reset playing state when video changes
        setPlaying(true);
    }, [youtubeVideoId, youtubePlaylistId]);

    if (!isVisible || (!embedUrl && !youtubeVideoId && !youtubePlaylistId)) return null;

    // Match web implementation - centered modal when maximized, bottom-right when minimized
    const MODAL_WIDTH = SCREEN_WIDTH * 0.95; // 95% width like web
    const VIDEO_ASPECT_RATIO = 9 / 16;
    const VIDEO_HEIGHT = MODAL_WIDTH * VIDEO_ASPECT_RATIO;
    const CONTROLS_HEIGHT = 40; // Space for the top controls row
    const MODAL_HEIGHT = VIDEO_HEIGHT + CONTROLS_HEIGHT;

    return (
        <>
            {/* Background overlay - only show when maximized */}
            {!isMinimized && (
                <View style={styles.overlay}>
                    <TouchableOpacity
                        style={styles.overlayTouchable}
                        activeOpacity={1}
                        onPress={closeVideo}
                    />
                </View>
            )}

            {/* Player container */}
            <Animated.View
                style={[
                    isMinimized ? {
                        // Minimized: bottom-right corner
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
                        // Maximized: centered modal like web
                        position: 'absolute',
                        width: MODAL_WIDTH,
                        height: MODAL_HEIGHT,
                        top: (SCREEN_HEIGHT - MODAL_HEIGHT) / 2,
                        left: (SCREEN_WIDTH - MODAL_WIDTH) / 2,
                        zIndex: 10000,
                        backgroundColor: '#1E293B',
                        borderRadius: 12,
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
                {/* Controls row */}
                <View style={styles.controlsRow}>
                    <IconButton
                        icon={isMinimized ? "window-maximize" : "window-minimize"}
                        iconColor="white"
                        size={isMinimized ? 16 : 20}
                        onPress={isMinimized ? maximizeVideo : minimizeVideo}
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

                {/* Maximize touch area (only when minimized) */}
                {isMinimized && (
                    <TouchableOpacity
                        onPress={maximizeVideo}
                        style={styles.minimizedTouchArea}
                        activeOpacity={0.9}
                    />
                )}

                {/* YouTube Player or WebView for other services */}
                <View style={styles.webviewContainer}>
                    {(youtubeVideoId || youtubePlaylistId) ? (
                        <YoutubePlayer
                            height={isMinimized ? MINIMIZED_HEIGHT - 30 : VIDEO_HEIGHT}
                            play={playing}
                            videoId={youtubeVideoId || undefined}
                            playList={youtubePlaylistId || undefined}
                            onError={(error: string) => console.error('[VideoPlayer] YouTube error:', error)}
                            onReady={() => console.log('[VideoPlayer] YouTube player ready')}
                            onChangeState={(state) => {
                                if (state === 'ended') setPlaying(false);
                            }}
                            webViewProps={{
                                androidLayerType: 'hardware',
                                mediaPlaybackRequiresUserAction: false,
                                allowsInlineMediaPlayback: true,
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
                            onError={(syntheticEvent) => {
                                const { nativeEvent } = syntheticEvent;
                                console.error('[VideoPlayer] WebView error:', nativeEvent);
                            }}
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
    },
    overlayTouchable: {
        flex: 1,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 4,
        marginBottom: 4,
        zIndex: 10,
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
