import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, IconButton, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { subscriptionsApi } from '../services/api';
import { useNavigation } from '@react-navigation/native';

enum NotificationMethod {
  PUSH = 'push',
  EMAIL = 'email',
  BOTH = 'both',
}

interface Subscription {
  id: string;
  program: {
    id: number;
    name: string;
    description?: string;
    logoUrl?: string;
    channel: {
      id: number;
      name: string;
      order?: number;
    };
  };
  notificationMethod: NotificationMethod;
  isActive: boolean;
  createdAt: string;
}

export const FavoritesScreen = () => {
    const navigation = useNavigation();
    const { session } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [menuVisible, setMenuVisible] = useState<string | null>(null);

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
            const response = await subscriptionsApi.getSubscriptions(session.accessToken);
            setSubscriptions(response.subscriptions || []);
        } catch (err) {
            setError('Error al cargar tus favoritos');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMethod = async (subscriptionId: string, method: NotificationMethod) => {
        if (!session?.accessToken) return;

        try {
            await subscriptionsApi.updateSubscription(subscriptionId, method, session.accessToken);
            setSubscriptions(prev => prev.map(sub =>
                sub.id === subscriptionId ? { ...sub, notificationMethod: method } : sub
            ));
            setMenuVisible(null);
        } catch (err) {
            Alert.alert('Error', 'No se pudo actualizar las preferencias');
        }
    };

    const handleDelete = async (subscriptionId: string) => {
        if (!session?.accessToken) return;

        Alert.alert(
            'Cancelar suscripción',
            '¿Estás seguro de que deseas cancelar esta suscripción?',
            [
                { text: 'Volver', style: 'cancel' },
                {
                    text: 'Cancelar suscripción',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await subscriptionsApi.deleteSubscription(subscriptionId, session.accessToken);
                            setSubscriptions(prev => prev.filter(sub => sub.id !== subscriptionId));
                        } catch (err) {
                            Alert.alert('Error', 'No se pudo cancelar la suscripción');
                        }
                    },
                },
            ]
        );
    };

    const getMethodLabel = (method: NotificationMethod) => {
        switch (method) {
            case NotificationMethod.BOTH:
                return 'Push y Email';
            case NotificationMethod.PUSH:
                return 'Solo Push';
            case NotificationMethod.EMAIL:
                return 'Solo Email';
            default:
                return method;
        }
    };

    if (!session) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyContainer}>
                    <Text variant="headlineMedium" style={styles.emptyText}>
                        Por favor inicia sesión
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <View>
                        <Text variant="headlineMedium" style={styles.title}>
                            Mis Favoritos
                        </Text>
                        <Text variant="bodyMedium" style={styles.subtitle}>
                            Gestiona tus suscripciones y preferencias
                        </Text>
                    </View>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.goBack()}
                        icon="arrow-left"
                        style={styles.backButton}
                    >
                        Volver
                    </Button>
                </View>

                {error ? (
                    <Text variant="bodyMedium" style={styles.errorText}>
                        {error}
                    </Text>
                ) : null}

                {subscriptions.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <Card.Content style={styles.emptyCardContent}>
                            <Text variant="headlineSmall" style={styles.emptyCardTitle}>
                                No tienes suscripciones activas
                            </Text>
                            <Text variant="bodyMedium" style={styles.emptyCardText}>
                                Suscríbete a tus programas favoritos haciendo clic en el ícono de campanita en la grilla de programación
                            </Text>
                            <Button
                                mode="contained"
                                onPress={() => navigation.navigate('Home' as never)}
                                style={styles.emptyCardButton}
                            >
                                Ir a la programación
                            </Button>
                        </Card.Content>
                    </Card>
                ) : (
                    subscriptions.map((subscription) => (
                        <Card key={subscription.id} style={styles.subscriptionCard}>
                            <Card.Content>
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardHeaderText}>
                                        <Text variant="titleLarge" style={styles.programName}>
                                            {subscription.program.name}
                                        </Text>
                                        <Text variant="bodySmall" style={styles.channelName}>
                                            {subscription.program.channel.name}
                                        </Text>
                                    </View>
                                </View>

                                {subscription.program.description && (
                                    <Text
                                        variant="bodyMedium"
                                        style={styles.description}
                                        numberOfLines={2}
                                    >
                                        {subscription.program.description}
                                    </Text>
                                )}

                                <View style={styles.notificationSection}>
                                    <Text variant="labelMedium" style={styles.notificationLabel}>
                                        Notificaciones:
                                    </Text>
                                    <Menu
                                        visible={menuVisible === subscription.id}
                                        onDismiss={() => setMenuVisible(null)}
                                        anchor={
                                            <Button
                                                mode="outlined"
                                                onPress={() => setMenuVisible(subscription.id)}
                                                style={styles.methodButton}
                                                contentStyle={styles.methodButtonContent}
                                            >
                                                {getMethodLabel(subscription.notificationMethod)}
                                            </Button>
                                        }
                                    >
                                        <Menu.Item
                                            onPress={() => handleUpdateMethod(subscription.id, NotificationMethod.BOTH)}
                                            title="Push y Email"
                                        />
                                        <Menu.Item
                                            onPress={() => handleUpdateMethod(subscription.id, NotificationMethod.PUSH)}
                                            title="Solo Push"
                                        />
                                        <Menu.Item
                                            onPress={() => handleUpdateMethod(subscription.id, NotificationMethod.EMAIL)}
                                            title="Solo Email"
                                        />
                                    </Menu>
                                </View>
                            </Card.Content>

                            <Card.Actions style={styles.cardActions}>
                                <Text variant="bodySmall" style={styles.dateText}>
                                    Desde {new Date(subscription.createdAt).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </Text>
                                <IconButton
                                    icon="delete"
                                    iconColor="#ef4444"
                                    size={20}
                                    onPress={() => handleDelete(subscription.id)}
                                />
                            </Card.Actions>
                        </Card>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    title: {
        color: '#f3f4f6',
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#9ca3af',
        marginTop: 4,
    },
    backButton: {
        borderColor: 'rgba(255,255,255,0.2)',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
    },
    errorText: {
        color: '#ef4444',
        marginBottom: 16,
        textAlign: 'center',
    },
    emptyCard: {
        backgroundColor: '#1e293b',
    },
    emptyCardContent: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyCardTitle: {
        color: '#f3f4f6',
        textAlign: 'center',
        marginBottom: 16,
    },
    emptyCardText: {
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: 300,
    },
    emptyCardButton: {
        marginTop: 8,
    },
    subscriptionCard: {
        marginBottom: 16,
        backgroundColor: '#1e293b',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardHeaderText: {
        flex: 1,
    },
    programName: {
        color: '#f3f4f6',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    channelName: {
        color: '#60a5fa',
    },
    description: {
        color: '#9ca3af',
        marginBottom: 16,
    },
    notificationSection: {
        marginTop: 8,
    },
    notificationLabel: {
        color: '#f3f4f6',
        marginBottom: 8,
    },
    methodButton: {
        borderColor: 'rgba(255,255,255,0.2)',
    },
    methodButtonContent: {
        justifyContent: 'flex-start',
    },
    cardActions: {
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    dateText: {
        color: '#9ca3af',
    },
});
