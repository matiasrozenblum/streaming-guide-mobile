import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, Linking, Pressable } from 'react-native';
import { Text, ActivityIndicator, IconButton, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { subscriptionsApi } from '../services/api';
import { StreamerService } from '../services/streamer.service';
import { Streamer, StreamingService } from '../types/streamer';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getColorForChannel } from '../utils/colors';
import { SvgUri } from 'react-native-svg';
import { trackEvent } from '../lib/analytics';

interface Subscription {
    id: string;
    program: {
        id: number;
        name: string;
        description?: string;
        logo_url?: string;
        channel: {
            id: number;
            name: string;
            logo_url?: string;
            background_color?: string; // Add background_color
        };
    };
    isActive: boolean;
    createdAt: string;
}

// Reusable Tile Component
const SubscriptionTile = ({
    title,
    subtitle,
    imageUrl,
    imageColor,
    isStreamer,
    onDelete,
    onPress,
    services
}: {
    title: string,
    subtitle?: React.ReactNode,
    imageUrl?: string,
    imageColor?: string,
    isStreamer?: boolean,
    onDelete: () => void,
    onPress?: () => void,
    services?: { service: StreamingService, url: string }[]
}) => {
    const [showDelete, setShowDelete] = useState(false);

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            // Toggle delete button visibility on tap if no other action
            setShowDelete(prev => !prev);
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            style={styles.tileContainer}
        >
            {/* Avatar Section */}
            <View style={[styles.avatarContainer, { backgroundColor: imageColor || '#1e293b' }]}>
                {imageUrl ? (
                    imageUrl.toLowerCase().endsWith('.svg') || imageUrl.includes('.svg?') ? (
                        <View style={isStreamer ? styles.streamerAvatarImage : styles.avatarImage}>
                            <SvgUri
                                width="100%"
                                height="100%"
                                uri={imageUrl}
                            />
                        </View>
                    ) : (
                        <Image
                            source={{ uri: imageUrl }}
                            style={isStreamer ? styles.streamerAvatarImage : styles.avatarImage}
                            resizeMode={isStreamer ? "cover" : "contain"}
                        />
                    )
                ) : (
                    <Text style={styles.avatarPlaceholderText}>
                        {title.charAt(0).toUpperCase()}
                    </Text>
                )}
            </View>

            {/* Content Section */}
            <View style={styles.contentContainer}>
                <View style={styles.titleRow}>
                    <Text variant="titleMedium" style={styles.tileTitle} numberOfLines={1}>
                        {title.toUpperCase()}
                    </Text>
                </View>

                {subtitle && <View style={styles.subtitleContainer}>{subtitle}</View>}

                {/* Services Row */}
                {services && services.length > 0 && (
                    <View style={styles.servicesRow}>
                        <Text style={styles.subText}>EN</Text>
                        {services.filter(s => s.service === StreamingService.TWITCH || s.service === StreamingService.KICK).map((s, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.serviceIconContainer}
                                onPress={() => {
                                    trackEvent('streamer_service_click', { action: 'streamer_service_click', click_url: s.url, channel_name: title });
                                    Linking.openURL(s.url);
                                }}
                            >
                                {s.service === StreamingService.TWITCH ? (
                                    <MaterialCommunityIcons name="twitch" size={20} color="#9146FF" />
                                ) : (
                                    <Image
                                        source={{ uri: 'https://dwtkmfahaokhtpuafhsc.supabase.co/storage/v1/object/sign/streaming-services-logos/Kick%20Icon%20(Green).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84ZWQzMzdmNy04YmEwLTQxYjAtYmJjOS05YjI2NjVhZWYwYzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW1pbmctc2VydmljZXMtbG9nb3MvS2ljayBJY29uIChHcmVlbikucG5nIiwiaWF0IjoxNzYzNTIwODQyLCJleHAiOjE3OTUwNTY4NDJ9.3cqNHCk9mYT4k6E7mUiIDIA8CWXWIKTUQK1iThtSrmo' }}
                                        style={{ width: 20, height: 20 }}
                                        resizeMode="contain"
                                    />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Delete Button (Conditional) */}
            {showDelete && (
                <IconButton
                    icon="close"
                    iconColor="#ef4444"
                    size={20}
                    onPress={onDelete}
                    style={styles.deleteButton}
                    mode="contained"
                    containerColor="rgba(30, 41, 59, 0.9)"
                />
            )}

            {/* Always visible trigger area for delete if not toggled? 
                Actually, simpler to just have a subtle X or allow the toggle behavior as requested.
                Let's stick to the toggle on press for now, or long press? 
                User asked for "tapping the card". 
            */}
        </Pressable>
    );
};

export const FavoritesScreen = () => {
    const navigation = useNavigation();
    const { session } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [streamerSubscriptions, setStreamerSubscriptions] = useState<Streamer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isProgramsExpanded, setIsProgramsExpanded] = useState(true);
    const [isStreamersExpanded, setIsStreamersExpanded] = useState(true);

    useEffect(() => {
        if (session?.accessToken) {
            loadSubscriptions();
        } else {
            setLoading(false);
        }
    }, [session]);

    const loadSubscriptions = async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        setError('');
        try {
            const subsResponse = await subscriptionsApi.getSubscriptions(session.accessToken);
            setSubscriptions(subsResponse.subscriptions || []);

            const [allStreamers, subscribedIds] = await Promise.all([
                StreamerService.getAll(),
                StreamerService.getSubscriptions(session.accessToken)
            ]);
            const subscribedStreamers = allStreamers
                .filter(s => subscribedIds.includes(s.id))
                .map(s => ({ ...s, is_subscribed: true }));
            setStreamerSubscriptions(subscribedStreamers);
        } catch (err) {
            setError('Error al cargar tus favoritos');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (subscriptionId: string) => {
        Alert.alert('Cancelar suscripción', '¿Estás seguro?', [
            { text: 'Volver', style: 'cancel' },
            {
                text: 'Sí', style: 'destructive', onPress: async () => {
                    await subscriptionsApi.deleteSubscription(subscriptionId, session!.accessToken!);
                    setSubscriptions(prev => prev.filter(s => s.id !== subscriptionId));
                }
            }
        ]);
    };

    const handleUnsubscribeStreamer = async (streamerId: number) => {
        Alert.alert('Dejar de seguir', '¿Estás seguro?', [
            { text: 'Volver', style: 'cancel' },
            {
                text: 'Sí', style: 'destructive', onPress: async () => {
                    await StreamerService.unsubscribe(streamerId, session!.accessToken!);
                    setStreamerSubscriptions(prev => prev.filter(s => s.id !== streamerId));
                }
            }
        ]);
    };

    if (!session) return (<SafeAreaView style={styles.container}><Text style={styles.textCenter}>Inicia sesión</Text></SafeAreaView>);
    if (loading) return (<SafeAreaView style={styles.container}><ActivityIndicator size="large" /></SafeAreaView>);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <View>
                        <Text variant="headlineMedium" style={styles.title}>Mis Favoritos</Text>
                        <Text variant="bodyMedium" style={styles.subtitle}>Gestiona tus suscripciones</Text>
                    </View>
                </View>

                {/* Programs Section */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => setIsProgramsExpanded(!isProgramsExpanded)}
                    >
                        <Text variant="titleMedium" style={styles.sectionTitle}>PROGRAMAS</Text>
                        <MaterialCommunityIcons
                            name={isProgramsExpanded ? "chevron-up" : "chevron-down"}
                            size={24}
                            color="#94a3b8"
                        />
                    </TouchableOpacity>
                    {isProgramsExpanded && (
                        <>
                            <View style={styles.grid}>
                                {subscriptions.map(sub => (
                                    <View key={sub.id} style={styles.gridItem}>
                                        <SubscriptionTile
                                            title={sub.program.name}
                                            subtitle={<Text style={styles.subText}>EN <Text style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{sub.program.channel.name.toUpperCase()}</Text></Text>}
                                            imageUrl={sub.program.channel.logo_url}
                                            imageColor={sub.program.channel.background_color || '#ffffff'}
                                            onDelete={() => handleDelete(sub.id)}
                                        />
                                    </View>
                                ))}
                            </View>
                            {subscriptions.length === 0 && <Text style={styles.emptyText}>No tienes programas favoritos.</Text>}
                        </>
                    )}
                </View>

                {/* Streamers Section */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => setIsStreamersExpanded(!isStreamersExpanded)}
                    >
                        <Text variant="titleMedium" style={styles.sectionTitle}>STREAMERS</Text>
                        <MaterialCommunityIcons
                            name={isStreamersExpanded ? "chevron-up" : "chevron-down"}
                            size={24}
                            color="#94a3b8"
                        />
                    </TouchableOpacity>
                    {isStreamersExpanded && (
                        <>
                            <View style={styles.grid}>
                                {streamerSubscriptions.map(streamer => (
                                    <View key={streamer.id} style={styles.gridItem}>
                                        <SubscriptionTile
                                            title={streamer.name}
                                            imageUrl={streamer.logo_url || undefined}
                                            imageColor={getColorForChannel((streamer.order ?? 1) - 1)}
                                            isStreamer={true}
                                            onDelete={() => handleUnsubscribeStreamer(streamer.id)}
                                            services={streamer.services}
                                        />
                                    </View>
                                ))}
                            </View>
                            {streamerSubscriptions.length === 0 && <Text style={styles.emptyText}>No sigues a ningún streamer.</Text>}
                        </>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scroll: { flex: 1 },
    content: { padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, alignItems: 'flex-start' },
    title: { color: '#f3f4f6', fontWeight: 'bold' },
    subtitle: { color: '#9ca3af', marginTop: 4 },
    section: { marginBottom: 32 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    sectionTitle: { color: '#94a3b8', fontWeight: 'bold', letterSpacing: 0.5, fontSize: 12 },
    textCenter: { textAlign: 'center', color: '#fff', marginTop: 20 },
    emptyText: { color: '#64748b', fontStyle: 'italic' },

    // Grid
    grid: { flexDirection: 'column', gap: 12 },
    gridItem: { width: '100%' }, // 1 column to stretch across the screen

    // Tile Styles
    tileContainer: {
        height: 72,
        backgroundColor: '#1e293b',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
        position: 'relative'
    },
    avatarContainer: {
        width: 72,
        height: 72,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden' // Ensure cover images stay within the rounded borders
    },
    avatarImage: { width: 64, height: 64 },
    streamerAvatarImage: { width: '100%', height: '100%' },
    avatarPlaceholderText: { color: '#fff', fontWeight: 'bold', fontSize: 24 },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tileTitle: {
        color: '#f1f5f9', fontWeight: 'bold', fontSize: 15, flex: 1
    },
    subText: { color: '#94a3b8', fontSize: 13 },
    subtitleContainer: { marginTop: 2 },

    servicesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    serviceIconContainer: {
        width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
        opacity: 0.8
    },

    deleteButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        margin: 0,
        zIndex: 10
    }
});
