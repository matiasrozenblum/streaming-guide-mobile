import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Schedule } from '../../types/schedule';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useVideoPlayer } from '../../context/VideoPlayerContext';
import { useAuth } from '../../context/AuthContext';
import { useLoginModal } from '../../context/LoginModalContext';
import { subscriptionsApi } from '../../services/api';
import { alpha, borderRadius, fontSize, fontWeight, spacing } from '../../theme/tokens';
import { getTheme } from '../../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

dayjs.extend(customParseFormat);

interface Props {
    schedule: Schedule;
    pixelsPerMinute: number;
    channelColor?: string | null;
}

export const ProgramBlock = ({ schedule, pixelsPerMinute, channelColor }: Props) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(schedule.subscribed);
    const [bellLoading, setBellLoading] = useState(false);

    // Re-sync subscription state when fresh data arrives (e.g. after V2 today fetch)
    useEffect(() => {
        setIsSubscribed(schedule.subscribed);
    }, [schedule.subscribed]);
    const { openVideo } = useVideoPlayer();
    const { session, isAuthenticated } = useAuth();
    const { show: showLogin } = useLoginModal();
    const [themeMode] = useState<'light' | 'dark'>('dark');
    const theme = getTheme(themeMode);

    const handleBellPress = async () => {
        if (!isAuthenticated || !session?.accessToken) {
            setModalVisible(false);
            showLogin();
            return;
        }

        setBellLoading(true);
        try {
            if (isSubscribed) {
                await subscriptionsApi.unsubscribe(schedule.program.id, session.accessToken);
                setIsSubscribed(false);
            } else {
                await subscriptionsApi.subscribe(schedule.program.id, session.accessToken);
                setIsSubscribed(true);
            }
        } catch (error) {
            console.error('Failed to toggle subscription:', error);
        } finally {
            setBellLoading(false);
        }
    };

    // Parsing start/end
    const [startH, startM] = schedule.start_time.split(':').map(Number);
    const [endH, endM] = schedule.end_time.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const duration = endMinutes - startMinutes;
    const width = Math.max(duration * pixelsPerMinute - 1, 1); // Width - 1px for spacing
    const left = startMinutes * pixelsPerMinute;

    const now = dayjs();
    const currentMinutes = now.hour() * 60 + now.minute();
    const isPast = endMinutes < currentMinutes;

    const baseColor = channelColor || '#1f2937';

    // Background opacity logic
    let bgOpacity = 0.15; // isNormal
    if (schedule.program.is_live) bgOpacity = 0.3;
    else if (isPast) bgOpacity = 0.05;

    const styleOverride = schedule.program.style_override;

    // Style override colors
    const getOverrideStyles = () => {
        if (styleOverride === 'boca') {
            return {
                bg: `rgba(21,101,192,${bgOpacity})`,
                border: isPast ? 'rgba(21,101,192,0.4)' : 'rgb(21,101,192)',
                textColor: '#FFFFFF',
                bandColor: `rgba(253,206,3,${bgOpacity})`,
                bandBorder: 'rgb(253,206,3)',
                bandRotation: '0deg',
                bandHeight: '44%',
            };
        }
        if (styleOverride === 'river') {
            return {
                bg: `rgba(255,255,255,${bgOpacity})`,
                border: isPast ? 'rgba(255,255,255,0.4)' : 'rgb(255,255,255)',
                textColor: '#FFFFFF',
                bandColor: `rgba(238,19,41,${bgOpacity})`,
                bandBorder: 'rgb(238,19,41)',
                bandRotation: '-20deg',
                bandHeight: '40%',
            };
        }
        return null;
    };

    const overrideStyles = getOverrideStyles();

    const backgroundColor = overrideStyles ? overrideStyles.bg : alpha(baseColor, bgOpacity);
    const borderColor = overrideStyles ? overrideStyles.border : (isPast ? alpha(baseColor, 0.3) : baseColor);

    return (
        <>
            <TouchableOpacity
                style={[
                    styles.block,
                    {
                        left,
                        width,
                        backgroundColor,
                        borderColor: borderColor,
                        borderWidth: 1,
                    }
                ]}
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
            >
                {/* Style override band (Boca/River) */}
                {overrideStyles && (
                    <View style={[
                        styles.overrideBand,
                        {
                            backgroundColor: overrideStyles.bandColor,
                            borderColor: overrideStyles.bandBorder,
                            borderWidth: 1,
                            height: overrideStyles.bandHeight as any,
                            transform: [{ rotate: overrideStyles.bandRotation }],
                        }
                    ]} />
                )}

                {/* LIVE Badge */}
                {schedule.program.is_live && (
                    <View style={styles.liveBadge}>
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                )}

                <View style={styles.content}>
                    <Text style={[styles.title, { color: overrideStyles ? overrideStyles.textColor : baseColor }]} numberOfLines={2}>
                        {schedule.program.name.toUpperCase()}
                    </Text>

                    {schedule.program.panelists && schedule.program.panelists.length > 0 && width > 120 && (
                        <Text style={[styles.panelists, { color: overrideStyles ? 'rgba(255,255,255,0.8)' : alpha(baseColor, 0.8) }]} numberOfLines={2}>
                            {schedule.program.panelists.map(p => p.name).join(', ')}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>

            <Modal
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
                animationType="fade"
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.tooltipContainer, { backgroundColor: theme.colors.surface }]}>
                                {/* Tooltip Content Matches Web */}

                                <Text style={[styles.tooltipTitle, { color: theme.colors.textPrimary }]}>
                                    {schedule.program.name.toUpperCase()}
                                </Text>

                                <Text style={[styles.tooltipTimeRange, { color: theme.colors.textSecondary }]}>
                                    {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                                </Text>

                                {schedule.program.description && (
                                    <ScrollView style={styles.tooltipScroll}>
                                        <Text style={[styles.tooltipDescription, { color: theme.colors.textPrimary }]}>
                                            {schedule.program.description}
                                        </Text>
                                    </ScrollView>
                                )}

                                {/* Panelists Section */}
                                {schedule.program.panelists?.length > 0 && (
                                    <View style={styles.panelistsSection}>
                                        <Text style={[styles.panelistsLabel, { color: theme.colors.textPrimary }]}>
                                            Panelistas:
                                        </Text>
                                        <Text style={[styles.panelistsText, { color: theme.colors.textSecondary }]}>
                                            {schedule.program.panelists.map(p => p.name).join(', ')}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.tooltipActions}>
                                    {/* YouTube/Stream Button - shows if stream_url exists */}
                                    {schedule.program.stream_url && (
                                        <TouchableOpacity
                                            style={styles.youtubeButtonWrapper}
                                            onPress={() => {
                                                setModalVisible(false);
                                                let service: 'youtube' | 'twitch' | 'kick' = 'youtube';
                                                if (schedule.program.stream_url?.includes('twitch')) service = 'twitch';
                                                if (schedule.program.stream_url?.includes('kick')) service = 'kick';

                                                if (schedule.program.stream_url) {
                                                    openVideo(schedule.program.stream_url, service);
                                                }
                                            }}
                                        >
                                            <LinearGradient
                                                colors={['#3b82f6', '#2563eb']} // Blue gradient from web theme
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.youtubeButton}
                                            >
                                                <MaterialCommunityIcons
                                                    name="open-in-new"
                                                    size={16}
                                                    color="#FFFFFF"
                                                    style={{ marginRight: 4 }}
                                                />
                                                <Text style={styles.youtubeButtonText}>
                                                    {schedule.program.is_live ? 'Ver en vivo' : 'Ver en Youtube'}
                                                </Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}

                                    {/* Notification Bell */}
                                    <TouchableOpacity
                                        style={styles.iconButton}
                                        onPress={handleBellPress}
                                        disabled={bellLoading}
                                    >
                                        {bellLoading ? (
                                            <ActivityIndicator size={20} color={theme.colors.primary} />
                                        ) : (
                                            <MaterialCommunityIcons
                                                name={isSubscribed ? 'bell-ring' : 'bell-outline'}
                                                size={24}
                                                color={isSubscribed ? theme.colors.primary : theme.colors.textSecondary}
                                            />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    block: {
        position: 'absolute',
        height: '100%',
        borderRadius: borderRadius.sm, // 2px
        overflow: 'hidden',
        // Shadow props
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    content: {
        padding: spacing.sm, // 8px
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'center', // Vertically center text to match web
        alignItems: 'center',
    },
    title: {
        fontSize: fontSize.xs, // 12px
        fontWeight: fontWeight.bold, // 700 - match web
        textAlign: 'center',
    },
    panelists: {
        fontSize: 10, // 0.65rem ≈ 10.4px, matching web
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 12,
    },
    time: {
        fontSize: 10, // Spec says 10px
        fontWeight: fontWeight.regular, // 400
        marginTop: 2,
    },
    liveBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#F44336',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 5,
        alignItems: 'center',
    },
    liveText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: fontWeight.bold,
    },
    overrideDot: {
        position: 'absolute',
        top: 6,
        left: 6,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'rgba(255, 152, 0, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 152, 0, 1)',
        zIndex: 5,
    },
    overrideBand: {
        position: 'absolute',
        top: '50%',
        left: '-10%',
        width: '120%',
        zIndex: 1,
        borderRadius: borderRadius.sm,
    },
    // Tooltip/Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Dimmed background
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltipContainer: {
        width: 300, // Range 280-320
        padding: spacing.md, // 16px
        borderRadius: borderRadius.lg, // 8px
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    tooltipLogo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
        alignSelf: 'center',
    },
    tooltipTitle: {
        fontSize: fontSize.lg, // 18px
        fontWeight: fontWeight.bold,
        marginBottom: 8,
        textAlign: 'left',
    },
    tooltipTimeRange: {
        fontSize: fontSize.sm, // 14px
        fontWeight: fontWeight.regular,
        marginBottom: 4,
        textAlign: 'left',
    },
    tooltipScroll: {
        maxHeight: 200,
        marginVertical: 12,
    },
    tooltipDescription: {
        fontSize: fontSize.sm, // 14px
        fontWeight: fontWeight.regular,
        lineHeight: 20,
        textAlign: 'left',
    },
    panelistsSection: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    panelistsLabel: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        marginBottom: 4,
        textAlign: 'left',
    },
    panelistsText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.regular,
        textAlign: 'left',
    },
    tooltipActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    youtubeButtonWrapper: {
        flex: 1,
        borderRadius: 4,
        overflow: 'hidden',
    },
    youtubeButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    youtubeButtonText: {
        color: '#FFFFFF',
        fontWeight: fontWeight.bold,
        fontSize: 14,
    },
    iconButton: {
        padding: 8,
    },
});
