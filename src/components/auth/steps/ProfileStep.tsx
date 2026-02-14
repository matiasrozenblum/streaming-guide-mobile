import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Keyboard } from 'react-native';
import { TextInput, Button, HelperText, Menu, Text, useTheme } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';

interface ProfileStepProps {
    initialFirst?: string;
    initialLast?: string;
    initialBirthDate?: string;
    initialGender?: string;
    onSubmit: (first: string, last: string, birthDate: string, gender: string) => void;
    onBack: () => void;
    isLoading?: boolean;
    error?: string;
}

const GENDER_MAP: Record<string, string> = {
    'male': 'Masculino',
    'female': 'Femenino',
    'non_binary': 'No binario',
    'rather_not_say': 'Prefiero no decir'
};

export const ProfileStep = ({
    initialFirst = '',
    initialLast = '',
    initialBirthDate = '',
    initialGender = '',
    onSubmit,
    onBack,
    isLoading,
    error
}: ProfileStepProps) => {
    const [firstName, setFirstName] = useState(initialFirst);
    const [lastName, setLastName] = useState(initialLast);
    const [birthDate, setBirthDate] = useState<Date | null>(
        initialBirthDate ? new Date(initialBirthDate) : null
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [gender, setGender] = useState(initialGender);
    const [genderMenuVisible, setGenderMenuVisible] = useState(false);
    const [localError, setLocalError] = useState('');
    const [birthDateError, setBirthDateError] = useState('');

    const theme = useTheme();

    const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setBirthDate(selectedDate);
            // Age validation
            const now = new Date();
            let age = now.getFullYear() - selectedDate.getFullYear();
            const m = now.getMonth() - selectedDate.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < selectedDate.getDate())) {
                age--;
            }
            if (age < 18) {
                setBirthDateError('Debés ser mayor de 18 años para registrarte');
            } else {
                setBirthDateError('');
            }
        }
    };

    const handleOpenConfigs = () => {
        Keyboard.dismiss();
        // Small timeout to ensure keyboard is gone before showing picker (optional but safer)
        setTimeout(() => setShowDatePicker(true), 100);
    }

    const getGenderLabel = () => {
        return GENDER_MAP[gender] || 'Género';
    };

    const getFormattedDate = () => {
        if (!birthDate) return '';
        return dayjs(birthDate).format('DD/MM/YYYY');
    };

    const handleSubmit = () => {
        if (!firstName || !lastName || !birthDate || !gender) {
            setLocalError('Por favor completa todos los campos');
            return;
        }
        if (birthDateError) return;

        setLocalError('');
        const formatted = dayjs(birthDate).format('DD/MM/YYYY');
        onSubmit(firstName, lastName, formatted, gender);
    };

    return (
        <View style={styles.container}>
            <TextInput
                label="Nombre"
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                style={styles.input}
                disabled={isLoading}
                left={<TextInput.Icon icon="account-outline" />}
            />
            <TextInput
                label="Apellido"
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                style={styles.input}
                disabled={isLoading}
                left={<TextInput.Icon icon="account-outline" />}
            />

            <View style={styles.row}>
                <TouchableOpacity
                    style={styles.halfInput}
                    onPress={handleOpenConfigs}
                    disabled={isLoading}
                    activeOpacity={0.7}
                >
                    <TextInput
                        label="Fecha de nac."
                        value={getFormattedDate()}
                        mode="outlined"
                        style={styles.input}
                        editable={false}
                        right={<TextInput.Icon icon="calendar" onPress={handleOpenConfigs} />}
                        pointerEvents="none"
                    />
                </TouchableOpacity>

                <View style={[styles.menuContainer, styles.halfInput]}>
                    <Menu
                        visible={genderMenuVisible}
                        onDismiss={() => setGenderMenuVisible(false)}
                        anchor={
                            <TouchableOpacity
                                onPress={() => { Keyboard.dismiss(); setGenderMenuVisible(true); }}
                                disabled={isLoading}
                                style={[
                                    styles.genderButton,
                                    { borderColor: theme.colors.outline }
                                ]}
                            >
                                <Text style={{ color: gender ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
                                    {getGenderLabel()}
                                </Text>
                            </TouchableOpacity>
                        }
                    >
                        <Menu.Item onPress={() => { setGender('male'); setGenderMenuVisible(false); }} title="Masculino" />
                        <Menu.Item onPress={() => { setGender('female'); setGenderMenuVisible(false); }} title="Femenino" />
                        <Menu.Item onPress={() => { setGender('non_binary'); setGenderMenuVisible(false); }} title="No binario" />
                        <Menu.Item onPress={() => { setGender('rather_not_say'); setGenderMenuVisible(false); }} title="Prefiero no decir" />
                    </Menu>
                </View>
            </View>

            {birthDateError ? (
                <HelperText type="error" visible>
                    {birthDateError}
                </HelperText>
            ) : null}

            {showDatePicker && (
                <DateTimePicker
                    value={birthDate || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                />
            )}

            {(localError || error) ? (
                <HelperText type="error" visible>
                    {localError || error}
                </HelperText>
            ) : null}

            <View style={styles.buttonContainer}>
                <Button
                    mode="outlined"
                    onPress={onBack}
                    disabled={isLoading}
                    style={[styles.button, styles.flexButton]}
                    icon="arrow-left"
                >
                    Volver
                </Button>
                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={isLoading}
                    disabled={isLoading || !firstName || !lastName || !birthDate || !gender || !!birthDateError}
                    style={[styles.button, styles.flexButton]}
                >
                    Continuar
                </Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    input: {
        backgroundColor: 'transparent',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    menuContainer: {
        paddingTop: 6,
    },
    genderButton: {
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 16,
        height: 50,
        justifyContent: 'center',
        marginTop: 0,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    button: {
        borderRadius: 6,
    },
    flexButton: {
        flex: 1,
    },
});
