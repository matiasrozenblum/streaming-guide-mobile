import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTheme } from '../theme';
import { spacing, borderRadius, fontSize, fontWeight } from '../theme/tokens';

interface Props {
    visible: boolean;
    onClose: () => void;
}

export const HolidayDialog = ({ visible, onClose }: Props) => {
    const theme = getTheme('dark');

    return (
        <Modal
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
            animationType="fade"
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.dialogContainer, { backgroundColor: theme.colors.surface }]}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={onClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>

                            <View style={styles.content}>
                                <Text style={[styles.messageText, { color: theme.colors.textPrimary }]}>
                                    Hoy es feriado en Argentina:{'\n'}
                                    las transmisiones en vivo{'\n'}
                                    pueden verse afectadas.
                                </Text>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialogContainer: {
        width: 'auto',
        maxWidth: '90%',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        position: 'relative',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 4,
        zIndex: 10,
    },
    content: {
        marginTop: 8,
        alignItems: 'center',
    },
    messageText: {
        textAlign: 'center',
        fontSize: fontSize.md,
        lineHeight: 22,
        fontWeight: fontWeight.regular,
    },
});
