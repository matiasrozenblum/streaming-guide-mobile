import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { MaterialIcons } from '@expo/vector-icons';
import { getTheme } from '../../theme';
import { ShareTarget } from '../../services/placaShare';

interface Action {
    id: ShareTarget;
    label: string;
    /** A FontAwesome brand glyph, or null for the one that is not a brand. */
    brand: string | null;
}

/**
 * The order the website uses, with "Guardar" last because it is the one that
 * does not leave the app.
 */
const ACTIONS: Action[] = [
    { id: 'instagram', label: 'Instagram', brand: 'instagram' },
    { id: 'tiktok', label: 'TikTok', brand: 'tiktok' },
    { id: 'whatsapp', label: 'WhatsApp', brand: 'whatsapp' },
    { id: 'x', label: 'X', brand: 'x-twitter' },
    { id: 'facebook', label: 'Facebook', brand: 'facebook-f' },
    { id: 'download', label: 'Guardar', brand: null },
];

export const ShareRow = ({
    onShare,
    busy,
}: {
    onShare: (target: ShareTarget) => void;
    /** Which target is in flight, so only that one shows a spinner. */
    busy: ShareTarget | null;
}) => {
    const theme = getTheme('dark');

    return (
        <View style={styles.row}>
            {ACTIONS.map((action) => {
                const isPrimary = action.id === 'download';
                const isBusy = busy === action.id;
                return (
                    <TouchableOpacity
                        key={action.id}
                        accessibilityRole="button"
                        accessibilityLabel={action.label}
                        disabled={busy !== null}
                        onPress={() => onShare(action.id)}
                        style={styles.item}
                    >
                        <View
                            style={[
                                styles.circle,
                                {
                                    backgroundColor: isPrimary
                                        ? theme.colors.primary
                                        : theme.colors.background,
                                    borderColor: isPrimary ? 'transparent' : theme.colors.border,
                                    opacity: busy !== null && !isBusy ? 0.4 : 1,
                                },
                            ]}
                        >
                            {isBusy ? (
                                <ActivityIndicator size="small" color="#F1F5F9" />
                            ) : action.brand ? (
                                <FontAwesome6
                                    name={action.brand as never}
                                    iconStyle="brand"
                                    size={20}
                                    color="#F1F5F9"
                                />
                            ) : (
                                <MaterialIcons name="file-download" size={22} color="#FFFFFF" />
                            )}
                        </View>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                            {action.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: 4,
    },
    item: {
        alignItems: 'center',
        gap: 6,
        width: 56,
    },
    circle: {
        width: 44,
        height: 44,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 11,
    },
});
