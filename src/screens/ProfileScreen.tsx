import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, IconButton, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';

type EditSection = 'none' | 'personal' | 'email' | 'password';

const genderOptions = [
  { label: 'Masculino', value: 'male' },
  { label: 'Femenino', value: 'female' },
  { label: 'No binario', value: 'non_binary' },
  { label: 'Prefiero no decir', value: 'rather_not_say' },
];

export const ProfileScreen = () => {
    const navigation = useNavigation();
    const { session, logout, updateUser } = useAuth();
    const [editSection, setEditSection] = useState<EditSection>('none');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Personal data
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState('');

    // Password
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (session?.user) {
            setFirstName(session.user.firstName || '');
            setLastName(session.user.lastName || '');
            setBirthDate(session.user.birthDate ? session.user.birthDate.slice(0, 10) : '');
            setGender(session.user.gender || '');
        }
    }, [session]);

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

    const handleSavePersonal = async () => {
        if (!firstName || !lastName) {
            setError('Por favor completa nombre y apellido');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await userApi.updateUser(
                session.user.id,
                { firstName, lastName, birthDate: birthDate || undefined, gender: gender || undefined },
                session.accessToken
            );

            updateUser({ firstName, lastName, birthDate, gender });
            setEditSection('none');
            Alert.alert('Éxito', 'Datos actualizados correctamente');
        } catch (err) {
            setError('Error al actualizar los datos');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await userApi.updateUser(
                session.user.id,
                { password: newPassword },
                session.accessToken
            );

            setEditSection('none');
            setNewPassword('');
            setConfirmPassword('');
            Alert.alert('Éxito', 'Contraseña actualizada correctamente');
        } catch (err) {
            setError('Error al actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Confirmar cancelación',
            '¿Estás seguro que deseas cancelar tu usuario? Esta acción es irreversible.',
            [
                { text: 'Volver', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await userApi.deleteUser(session.user.id, session.accessToken);
                            await logout();
                        } catch (err) {
                            Alert.alert('Error', 'No se pudo cancelar la cuenta');
                        }
                    },
                },
            ]
        );
    };

    const genderLabel = genderOptions.find(g => g.value === gender)?.label || '—';

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.title}>
                        Mi cuenta
                    </Text>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.goBack()}
                        icon="arrow-left"
                        style={styles.backButton}
                    >
                        Volver
                    </Button>
                </View>

                {/* Personal Data Section */}
                <Card style={styles.card}>
                    <Card.Title
                        title="Datos personales"
                        right={(props) => (
                            <IconButton
                                {...props}
                                icon="pencil"
                                onPress={() => setEditSection('personal')}
                            />
                        )}
                    />
                    <Card.Content>
                        {editSection !== 'personal' ? (
                            <View>
                                <View style={styles.row}>
                                    <View style={styles.col}>
                                        <Text variant="labelMedium" style={styles.label}>Nombre</Text>
                                        <Text variant="bodyLarge">{firstName || '—'}</Text>
                                    </View>
                                    <View style={styles.col}>
                                        <Text variant="labelMedium" style={styles.label}>Apellido</Text>
                                        <Text variant="bodyLarge">{lastName || '—'}</Text>
                                    </View>
                                </View>
                                <View style={styles.row}>
                                    <View style={styles.col}>
                                        <Text variant="labelMedium" style={styles.label}>Fecha de nacimiento</Text>
                                        <Text variant="bodyLarge">
                                            {birthDate ? dayjs(birthDate).format('DD/MM/YYYY') : '—'}
                                        </Text>
                                    </View>
                                    <View style={styles.col}>
                                        <Text variant="labelMedium" style={styles.label}>Género</Text>
                                        <Text variant="bodyLarge">{genderLabel}</Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <TextInput
                                    label="Nombre"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    mode="outlined"
                                    style={styles.input}
                                    disabled={loading}
                                />
                                <TextInput
                                    label="Apellido"
                                    value={lastName}
                                    onChangeText={setLastName}
                                    mode="outlined"
                                    style={styles.input}
                                    disabled={loading}
                                />
                                {error ? <HelperText type="error">{error}</HelperText> : null}
                                <View style={styles.buttonRow}>
                                    <Button
                                        mode="outlined"
                                        onPress={() => setEditSection('none')}
                                        style={styles.buttonHalf}
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={handleSavePersonal}
                                        style={styles.buttonHalf}
                                        loading={loading}
                                        disabled={loading}
                                    >
                                        Guardar
                                    </Button>
                                </View>
                            </View>
                        )}
                    </Card.Content>
                </Card>

                {/* Email Section */}
                <Card style={styles.card}>
                    <Card.Title
                        title="Correo electrónico"
                    />
                    <Card.Content>
                        <Text variant="bodyLarge">{session.user.email}</Text>
                    </Card.Content>
                </Card>

                {/* Password Section */}
                <Card style={styles.card}>
                    <Card.Title
                        title="Contraseña"
                        right={(props) => (
                            <IconButton
                                {...props}
                                icon="pencil"
                                onPress={() => setEditSection('password')}
                            />
                        )}
                    />
                    <Card.Content>
                        {editSection !== 'password' ? (
                            <Text variant="bodyLarge">••••••••</Text>
                        ) : (
                            <View>
                                <TextInput
                                    label="Nueva contraseña"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showPassword}
                                    mode="outlined"
                                    style={styles.input}
                                    disabled={loading}
                                    right={
                                        <TextInput.Icon
                                            icon={showPassword ? 'eye-off' : 'eye'}
                                            onPress={() => setShowPassword(!showPassword)}
                                        />
                                    }
                                />
                                <TextInput
                                    label="Confirmar contraseña"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                    mode="outlined"
                                    style={styles.input}
                                    disabled={loading}
                                />
                                {error ? <HelperText type="error">{error}</HelperText> : null}
                                <View style={styles.buttonRow}>
                                    <Button
                                        mode="outlined"
                                        onPress={() => setEditSection('none')}
                                        style={styles.buttonHalf}
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={handleChangePassword}
                                        style={styles.buttonHalf}
                                        loading={loading}
                                        disabled={loading}
                                    >
                                        Cambiar
                                    </Button>
                                </View>
                            </View>
                        )}
                    </Card.Content>
                </Card>

                {/* Delete Account Button */}
                <Button
                    mode="contained"
                    buttonColor="#ef4444"
                    onPress={handleDeleteAccount}
                    style={styles.deleteButton}
                >
                    Cancelar mi usuario
                </Button>
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
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        color: '#f3f4f6',
        fontWeight: 'bold',
    },
    backButton: {
        borderColor: 'rgba(255,255,255,0.2)',
    },
    card: {
        marginBottom: 16,
        backgroundColor: '#1e293b',
    },
    row: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    col: {
        flex: 1,
    },
    label: {
        color: '#9ca3af',
        marginBottom: 4,
    },
    input: {
        marginBottom: 12,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    buttonHalf: {
        flex: 1,
    },
    deleteButton: {
        marginTop: 16,
        marginBottom: 32,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
    },
});
