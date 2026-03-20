import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Streamer, StreamingService } from '../types/streamer';
import { getColorForChannel } from '../utils/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoPlayer } from '../context/VideoPlayerContext';
import { alpha } from '../theme/tokens';
import { getTheme } from '../theme';
import { trackEvent } from '../lib/analytics';

interface Props {
    streamer: Streamer;
    index: number;
    onToggleSubscription?: () => void;
    isSubscriptionLoading?: boolean;
    isAuthenticated?: boolean;
}

export const StreamerCard = ({ streamer, index, onToggleSubscription, isSubscriptionLoading, isAuthenticated }: Props) => {
    const { openVideo } = useVideoPlayer();
    const theme = getTheme('dark'); // TODO: Get from context

    const handleServicePress = (url: string, service: StreamingService) => {
        trackEvent('streamer_service_click', { action: 'streamer_service_click', click_url: url, channel_name: streamer.name });
        if (service === 'youtube' || service === 'twitch' || service === 'kick') {
            openVideo(url, service);
        } else {
            Linking.openURL(url);
        }
    };

    const getServiceIconName = (service: StreamingService): any => {
        switch (service) {
            case 'twitch': return 'twitch';
            case 'youtube': return 'youtube';
            case 'kick': return 'alpha-k-box';
            default: return 'web';
        }
    };

    const getServiceColor = (service: StreamingService) => {
        switch (service) {
            case 'twitch': return theme.colors.twitch;
            case 'kick': return theme.colors.kick;
            case 'youtube': return theme.colors.youtube;
            default: return theme.colors.primary;
        }
    };

    // Determine if dual service (Twitch + Kick)
    const hasTwitch = streamer.services.some(s => s.service === 'twitch');
    const hasKick = streamer.services.some(s => s.service === 'kick');
    const isDual = hasTwitch && hasKick;

    // Get service colors for glow/border
    const twitchColor = theme.colors.twitch;
    const kickColor = theme.colors.kick;
    const singleServiceColor = hasTwitch ? twitchColor : hasKick ? kickColor :
        streamer.services[0] ? getServiceColor(streamer.services[0].service) : null;

    // Card Content
    const cardContent = (
        <View style={styles.card}>
            {/* Image Section - Square (1:1 aspect ratio) */}
            <View style={styles.imageSection}>
                {/* LIVE/OFFLINE Badge */}
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: streamer.is_live ? '#F44336' : '#6B7280' }
                ]}>
                    <Text style={styles.statusText}>
                        {streamer.is_live ? 'LIVE' : 'OFFLINE'}
                    </Text>
                </View>

                {/* Subscription Button - Top Left */}
                {isAuthenticated && onToggleSubscription && (
                    <TouchableOpacity
                        style={styles.subscriptionButton}
                        onPress={onToggleSubscription}
                        disabled={isSubscriptionLoading}
                    >
                        {isSubscriptionLoading ? (
                            <ActivityIndicator size="small" color="#FFD700" />
                        ) : (
                            <MaterialCommunityIcons
                                name={streamer.is_subscribed ? "bell" : "bell-outline"}
                                size={20}
                                color={streamer.is_subscribed ? "#FFD700" : "#FFFFFF"}
                            />
                        )}
                    </TouchableOpacity>
                )}

                {/* Avatar/Logo */}
                {streamer.logo_url ? (
                    <Image
                        source={{ uri: streamer.logo_url }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.placeholder, { backgroundColor: getColorForChannel(index, 'dark') }]}>
                        <Text style={styles.placeholderText}>
                            {streamer.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                {/* Streamer Name */}
                <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {streamer.name}
                </Text>

                {/* Service Buttons - Match web: one button per service (Twitch/Kick only) */}
                <View style={styles.serviceButtonsContainer}>
                    {streamer.services
                        .filter(service => service.service === 'twitch' || service.service === 'kick')
                        .map((service, idx) => {
                            const serviceColor = getServiceColor(service.service);
                            const iconName = getServiceIconName(service.service);
                            const serviceName = service.service === 'twitch' ? 'Twitch' : 'Kick';

                            const isActivePlatform = streamer.is_live && streamer.active_services?.includes(service.service);
                            const isOtherPlatformActive = streamer.is_live && !isActivePlatform && streamer.active_services && streamer.active_services.length > 0;

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.serviceButton,
                                        {
                                            borderColor: alpha(serviceColor, 0.4),
                                            opacity: isOtherPlatformActive ? 0.35 : 1,
                                        }
                                    ]}
                                    onPress={() => handleServicePress(service.url, service.service)}
                                >
                                    {service.service === 'kick' ? (
                                        <Image
                                            source={{ uri: 'https://dwtkmfahaokhtpuafhsc.supabase.co/storage/v1/object/sign/streaming-services-logos/Kick%20Icon%20(Green).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84ZWQzMzdmNy04YmEwLTQxYjAtYmJjOS05YjI2NjVhZWYwYzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW1pbmctc2VydmljZXMtbG9nb3MvS2ljayBJY29uIChHcmVlbikucG5nIiwiaWF0IjoxNzYzNTIwODQyLCJleHAiOjE3OTUwNTY4NDJ9.3cqNHCk9mYT4k6E7mUiIDIA8CWXWIKTUQK1iThtSrmo' }}
                                            style={{ width: 18, height: 18 }}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <MaterialCommunityIcons
                                            name={iconName}
                                            size={18}
                                            color={serviceColor}
                                        />
                                    )}
                                    <Text style={[styles.serviceButtonText, { color: serviceColor }]}>
                                        Ver en {serviceName}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                </View>
            </View>
        </View>
    );

    const showGlow = hasTwitch || hasKick || streamer.is_live;
    const glowColorLeft = hasTwitch ? twitchColor : kickColor;
    const glowColorRight = hasKick ? kickColor : twitchColor;

    // Renders custom dual/single color gradients in place of native OS shadows for 100% uniformity
    const CrossPlatformGlow = () => {
        if (!showGlow) return null;

        // Simulates a soft Gaussian blur for a true "neon" glow using concentric rings.
        const GLOW_LAYERS = 6;

        return (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {Array.from({ length: GLOW_LAYERS }).map((_, i) => {
                    const offset = i * 2.5 + 1; // Spreads out wide (1, 3.5, 6, 8.5, 11, 13.5)
                    // Very low base opacity so the accumulated layers form a sheer fuzzy halo
                    const opacity = 0.12 * Math.pow(0.6, i);
                    return (
                        <LinearGradient
                            key={i}
                            colors={[alpha(glowColorLeft, opacity), alpha(glowColorRight, opacity)]}
                            start={isDual ? { x: 0, y: 0.5 } : undefined}
                            end={isDual ? { x: 1, y: 0.5 } : undefined}
                            style={{
                                position: 'absolute',
                                top: -offset,
                                bottom: -offset,
                                left: -offset,
                                right: -offset,
                                borderRadius: 11 + offset,
                            }}
                        />
                    );
                })}
            </View>
        );
    };

    return (
        <View style={[styles.cardContainer, {
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 8
        }]}>
            <CrossPlatformGlow />

            {isDual ? (
                <LinearGradient
                    colors={[alpha(glowColorLeft, 0.8), alpha(glowColorRight, 0.8)]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.gradientBorderWrapper}
                >
                    {cardContent}
                </LinearGradient>
            ) : (
                <View style={[
                    styles.singleServiceWrapper,
                    { borderColor: singleServiceColor ? alpha(singleServiceColor, 0.8) : theme.colors.border }
                ]}>
                    {cardContent}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        flex: 1,
        margin: 8, // Gap logic: 8px margin = 16px gap
    },
    gradientBorderWrapper: {
        borderRadius: 12,
        padding: 1, // Border thickness - match single service border width
        overflow: 'visible',
    },
    singleServiceWrapper: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'visible',
    },
    card: {
        borderRadius: 12, // Inner radius (24 - 1)
        backgroundColor: '#0F172A', // theme.surface
        overflow: 'hidden',
    },
    imageSection: {
        position: 'relative',
        width: '100%',
        aspectRatio: 1, // Square (1:1)
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    statusBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 3,
        zIndex: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    subscriptionButton: {
        position: 'absolute',
        top: 6,
        left: 6,
        padding: 4,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 5,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#FFFFFF',
        fontSize: 32, // 2rem
        fontWeight: '700',
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 12,
        paddingBottom: 12,
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    serviceButtonsContainer: {
        flexDirection: 'column',
        justifyContent: 'flex-end',
        gap: 6,
        width: '100%',
        height: 86, // Explicit height to fix 1-button card alignment
    },
    serviceButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    serviceButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
