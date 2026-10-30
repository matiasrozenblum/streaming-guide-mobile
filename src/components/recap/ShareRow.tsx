import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
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
 * does not leave the app. The label survives as the accessibility name even
 * though it is no longer drawn: a screen reader still has to announce each
 * one, and a bare glyph announces nothing.
 */
const ACTIONS: Action[] = [
    { id: 'instagram', label: 'Instagram', brand: 'instagram' },
    { id: 'whatsapp', label: 'WhatsApp', brand: 'whatsapp' },
    { id: 'x', label: 'X', brand: 'x-twitter' },
    { id: 'facebook', label: 'Facebook', brand: 'facebook-f' },
    { id: 'download', label: 'Guardar', brand: null },
];

export const ShareRow = ({
    onShare,
    busy,
    disabled,
}: {
    onShare: (target: ShareTarget) => void;
    /**
     * Which target should show a spinner — not the same thing as which one is
     * in flight. The caller holds this back for a moment so a fast action
     * never flashes one.
     */
    busy: ShareTarget | null;
    /** Blocks every button while something is in flight, without dimming them. */
    disabled: boolean;
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
                        disabled={disabled}
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
                                    // The dark navy the section used to have as
                                    // its background. Against the lighter slate
                                    // the app uses everywhere, it reads as a
                                    // ring; the old border was so close to the
                                    // surface that the circles dissolved.
                                    borderColor: isPrimary
                                        ? 'transparent'
                                        : theme.colors.surface,
                                    // Deliberately not dimmed while another
                                    // button works: half a second of every
                                    // icon fading out and back reads as a
                                    // flicker, not as feedback.
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
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
    },
    item: {
        alignItems: 'center',
    },
    circle: {
        width: 44,
        height: 44,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
