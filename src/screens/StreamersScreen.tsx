import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Header } from '../components/Header';
import { Streamer } from '../types/streamer';
import { StreamerService } from '../services/streamer.service';
import { StreamerCard } from '../components/StreamerCard';

export const StreamersScreen = () => {
    const [streamers, setStreamers] = useState<Streamer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStreamers = async () => {
        try {
            const data = await StreamerService.getAll();
            setStreamers(data);
        } catch (error) {
            console.error('Failed to fetch streamers', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStreamers();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStreamers();
    }, []);

    const renderItem = ({ item, index }: { item: Streamer; index: number }) => (
        <StreamerCard streamer={item} index={index} />
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
