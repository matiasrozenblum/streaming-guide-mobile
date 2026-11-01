import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Switch, Text } from 'react-native-paper';
import { userApi } from '../../services/api';
import { getTheme } from '../../theme';

type Setting = 'weekly' | 'monthly';

const ROWS: Array<{ key: Setting; label: string; hint: string }> = [
    {
        key: 'weekly',
        label: 'Resumen semanal',
        hint: 'Te avisamos los viernes, cuando está listo.',
    },
    {
        key: 'monthly',
        label: 'Resumen mensual',
        hint: 'Una vez por mes, sobre el final.',
    },
];

/**
 * The two switches that decide whether we may announce a recap on this phone.
 *
 * Optimistic: the switch moves on the tap and goes back if the request fails.
 * Waiting for a round trip to animate a toggle makes the app feel broken, and
 * the cost of being wrong for a moment is that one notification arrives — or
 * does not — which the next publication corrects anyway.
 */
export const RecapNotificationSettings = () => {
    const theme = getTheme('dark');
    const [settings, setSettings] = useState<Record<Setting, boolean> | null>(null);

    useEffect(() => {
        let cancelled = false;
        userApi
            .getRecapPushSettings()
            .then((value) => {
                if (!cancelled) setSettings(value);
            })
            .catch(() => {
                // Nothing useful to say: the card stays out of the way rather
                // than showing switches whose position we cannot vouch for.
                if (!cancelled) setSettings(null);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const toggle = useCallback((key: Setting, value: boolean) => {
        setSettings((current) => (current ? { ...current, [key]: value } : current));
        userApi.updateRecapPushSettings({ [key]: value }).catch(() => {
            setSettings((current) =>
                current ? { ...current, [key]: !value } : current,
            );
        });
    }, []);

    if (!settings) return null;

    return (
        <Card style={styles.card}>
            <Card.Title title="Avisos de Mi resumen" />
            <Card.Content>
                {ROWS.map((row, index) => (
                    <View
                        key={row.key}
                        style={[styles.row, index > 0 && styles.rowSpaced]}
                    >
                        <View style={styles.label}>
                            <Text variant="bodyLarge">{row.label}</Text>
                            <Text
                                variant="bodySmall"
                                style={{ color: theme.colors.textSecondary }}
                            >
                                {row.hint}
                            </Text>
                        </View>
                        <Switch
                            value={settings[row.key]}
                            onValueChange={(value) => toggle(row.key, value)}
                            accessibilityLabel={row.label}
                        />
                    </View>
                ))}
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    rowSpaced: {
        marginTop: 16,
    },
    label: {
        flex: 1,
        gap: 2,
    },
});
