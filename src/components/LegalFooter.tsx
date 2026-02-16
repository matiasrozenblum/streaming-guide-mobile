import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { getTheme } from '../theme';
import { fontSize } from '../theme/tokens';

export const FOOTER_HEIGHT = 80;

interface LegalFooterProps {
    width: number;
}

export const LegalFooter = ({ width }: LegalFooterProps) => {
    const theme = getTheme('dark');

    const handlePress = (url: string) => {
        Linking.openURL(url);
    };

    return (
        <View style={[styles.container, { width, height: FOOTER_HEIGHT, backgroundColor: theme.colors.background }]}>
            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.copyright, { color: theme.colors.textSecondary }]}>
                © 2026 LA GUÍA DEL STREAMING. Todos los derechos reservados.
            </Text>
            <View style={styles.linksRow}>
                <TouchableOpacity onPress={() => handlePress('https://laguiadelstreaming.com/terminos')}>
                    <Text style={[styles.link, { color: theme.colors.textSecondary }]}>Términos y Condiciones</Text>
                </TouchableOpacity>
                <Text style={[styles.divider, { color: theme.colors.textSecondary }]}>•</Text>
                <TouchableOpacity onPress={() => handlePress('https://laguiadelstreaming.com/privacidad')}>
                    <Text style={[styles.link, { color: theme.colors.textSecondary }]}>Política de Privacidad</Text>
                </TouchableOpacity>
                <Text style={[styles.divider, { color: theme.colors.textSecondary }]}>•</Text>
                <TouchableOpacity onPress={() => handlePress('https://laguiadelstreaming.com/cookies')}>
                    <Text style={[styles.link, { color: theme.colors.textSecondary }]}>Configurar Cookies</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    separator: {
        height: 1,
        width: '100%',
        marginBottom: 16,
        opacity: 0.2,
    },
    copyright: {
        fontSize: 10,
        marginBottom: 8,
        textAlign: 'center',
    },
    linksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    link: {
        fontSize: 10,
        textDecorationLine: 'underline',
    },
    divider: {
        fontSize: 10,
        marginHorizontal: 6,
    },
});
