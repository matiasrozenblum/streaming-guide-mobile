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

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.serviceButton,
                                        {
                                            borderColor: alpha(serviceColor, 0.4),
                                        }
                                    ]}
                                    onPress={() => handleServicePress(service.url, service.service)}
                                >
                                    <MaterialCommunityIcons
                                        name={iconName}
                                        size={16}
                                        color={serviceColor}
                                    />
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

    // Render with or without gradient border wrapper
    if (isDual) {
        // Dual service: LinearGradient border wrapper (left to right: purple -> green)
        // Apply alpha to match single-service border opacity
        return (
            <View style={styles.cardContainer}>
                <LinearGradient
                    colors={[alpha(twitchColor, 0.4), alpha(kickColor, 0.4)]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={[
                        styles.gradientBorderWrapper,
                        {
                            shadowColor: twitchColor,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: streamer.is_live ? 0.4 : 0,
                            shadowRadius: streamer.is_live ? 10 : 0,
                            elevation: streamer.is_live ? 5 : 1,
                        }
                    ]}
                >
                    {cardContent}
                </LinearGradient>
            </View>
        );
    } else {
        // Single service: Regular border with glow
        return (
            <View style={styles.cardContainer}>
                <View style={[
                    styles.singleServiceWrapper,
                    {
                        borderColor: singleServiceColor ? alpha(singleServiceColor, 0.4) : theme.colors.border,
                        shadowColor: singleServiceColor || '#000',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: streamer.is_live && singleServiceColor ? 0.4 : 0,
                        shadowRadius: streamer.is_live ? 10 : 0,
                        elevation: streamer.is_live ? 5 : 1,
                    }
                ]}>
                    {cardContent}
                </View>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    cardContainer: {
        flex: 1,
        margin: 8, // Gap logic: 8px margin = 16px gap
    },
    gradientBorderWrapper: {
        borderRadius: 24,
        padding: 1, // Border thickness - match single service border width
        overflow: 'visible',
    },
    singleServiceWrapper: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'visible',
    },
    card: {
        borderRadius: 23, // Inner radius (24 - 1)
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
        gap: 6,
        width: '100%',
        minHeight: 78, // Reserve space for 2 buttons: 36px + 6px gap + 36px = 78px
    },
    serviceButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    serviceButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
