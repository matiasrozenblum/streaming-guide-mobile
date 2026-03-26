import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLoginModal } from '../context/LoginModalContext';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Header } from '../components/Header';
import { Streamer } from '../types/streamer';
import { StreamerService } from '../services/streamer.service';
import { StreamerCard } from '../components/StreamerCard';
import { requestNotificationPermission } from '../hooks/usePushNotifications';
import { trackEvent } from '../lib/analytics';

export const StreamersScreen = () => {
    const { session } = useAuth();
    const { show: showLogin } = useLoginModal();
    const [streamers, setStreamers] = useState<Streamer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [subscriptionLoading, setSubscriptionLoading] = useState<Record<number, boolean>>({});

    const fetchStreamers = async () => {
        try {
            const data = await StreamerService.getAll();

            // If logged in, fetch subscriptions
            if (session?.accessToken) {
                const subscribedIds = await StreamerService.getSubscriptions(session.accessToken);
                const subscribedSet = new Set(subscribedIds);

                const streamersWithSub = data.map(s => ({
                    ...s,
                    is_subscribed: subscribedSet.has(s.id)
                }));
                setStreamers(streamersWithSub);
            } else {
                setStreamers(data);
            }
        } catch (error) {
            console.error('Failed to fetch streamers', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStreamers();
    }, [session?.accessToken]); // Re-fetch when session changes

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStreamers();
    }, [session?.accessToken]);

    const handleToggleSubscription = async (streamer: Streamer) => {
        if (!session?.accessToken) {
            showLogin();
            return;
        }

        const isSubscribed = streamer.is_subscribed;
        const newStatus = !isSubscribed;

        // Optimistic update
        setStreamers(prev => prev.map(s =>
            s.id === streamer.id ? { ...s, is_subscribed: newStatus } : s
        ));
        setSubscriptionLoading(prev => ({ ...prev, [streamer.id]: true }));

        try {
            if (newStatus) {
                // Request notification permission before subscribing
                const permissionGranted = await requestNotificationPermission();
                if (!permissionGranted) {
                    // Revert optimistic update
                    setStreamers(prev => prev.map(s =>
                        s.id === streamer.id ? { ...s, is_subscribed: isSubscribed } : s
                    ));
                    Alert.alert(
                        'Notificaciones desactivadas',
                        'Para recibir alertas cuando un streamer comience a transmitir, necesitás habilitar las notificaciones en la configuración de tu dispositivo.',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                                text: 'Ir a Configuración',
                                onPress: () => {
                                    if (Platform.OS === 'ios') {
                                        Linking.openURL('app-settings:');
                                    } else {
                                        Linking.openSettings();
                                    }
                                },
                            },
                        ],
                    );
                    return;
                }
                await StreamerService.subscribe(streamer.id, session.accessToken);
                trackEvent('streamer_subscribe', { 
                    streamer_id: streamer.id.toString(),
                    streamer_name: streamer.name,
                });
            } else {
                await StreamerService.unsubscribe(streamer.id, session.accessToken);
                trackEvent('streamer_unsubscribe', { 
                    streamer_id: streamer.id.toString(),
                    streamer_name: streamer.name,
                });
            }
        } catch (error) {
            console.error('Error toggling subscription:', error);
            // Revert on error
            setStreamers(prev => prev.map(s =>
                s.id === streamer.id ? { ...s, is_subscribed: isSubscribed } : s
            ));
        } finally {
            setSubscriptionLoading(prev => ({ ...prev, [streamer.id]: false }));
        }
    };

    const renderItem = ({ item, index }: { item: Streamer; index: number }) => (
        <StreamerCard
            streamer={item}
            index={index}
            onToggleSubscription={() => handleToggleSubscription(item)}
            isSubscriptionLoading={!!subscriptionLoading[item.id]}
        />
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                <Header />
                <View style={styles.content}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#2563eb" />
                        </View>
                    ) : (
                        <FlashList
                            data={streamers}
                            renderItem={renderItem}
                            // @ts-ignore
                            estimatedItemSize={240}
                            numColumns={2}
                            contentContainerStyle={styles.listContent}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#fff"
                                />
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No hay streamers disponibles</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1E293B', // Match theme and other screens
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 8,
        paddingBottom: 80, // Space for bottom tab bar
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 16,
        textAlign: 'center',
    },
});
