import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, fontSize, fontWeight } from '../../theme/tokens';

interface ParsedGradient {
    colors: string[];
    angle: number;
}

const isSvgUrl = (url: string) => {
    const path = url.split('?')[0];
    return path.toLowerCase().endsWith('.svg');
};

const parseGradient = (value: string): ParsedGradient | null => {
    if (!value.startsWith('linear-gradient')) return null;
    const match = value.match(/linear-gradient\((.+)\)/);
    if (!match) return null;
    const inner = match[1];
    const angleMatch = inner.match(/^(\d+)deg/);
    const angle = angleMatch ? parseInt(angleMatch[1], 10) : 180;
    const colorMatches = inner.match(/#[0-9a-fA-F]{3,8}/g);
    if (!colorMatches || colorMatches.length < 2) return null;
    return { colors: colorMatches, angle };
};

const angleToPoints = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
        start: { x: 0.5 - Math.cos(rad) * 0.5, y: 0.5 - Math.sin(rad) * 0.5 },
        end: { x: 0.5 + Math.cos(rad) * 0.5, y: 0.5 + Math.sin(rad) * 0.5 },
    };
};

const isGradient = (color: string | undefined | null): boolean =>
    !!color && (color.startsWith('linear-gradient') || color.startsWith('radial-gradient'));

const sanitizeBgColor = (color: string | undefined | null): string => {
    if (!color || isGradient(color)) {
        return '#FFFFFF';
    }
    return color;
};

interface ChannelLogoProps {
    channel: {
        name: string;
        logo_url: string;
        background_color?: string | null;
    };
}

export const ChannelLogo = ({ channel }: ChannelLogoProps) => {
    const [imageError, setImageError] = useState(false);

    const logoUrl = channel.logo_url;
    const rawBgColor = channel.background_color;
    const gradient = rawBgColor ? parseGradient(rawBgColor) : null;
    const bgColor = sanitizeBgColor(rawBgColor);

    const renderLogoContent = () => {
        if (isSvgUrl(logoUrl!)) {
            return (
                <SvgUri
                    uri={logoUrl!}
                    width={100}
                    height={42}
                    onError={() => setImageError(true)}
                />
            );
        }
        return (
            <Image
                source={{
                    uri: logoUrl!,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile; rv:88.0) Gecko/88.0 Firefox/88.0' }
                }}
                style={styles.logo}
                resizeMode="contain"
                onError={() => setImageError(true)}
            />
        );
    };

    if (!logoUrl || imageError) {
        return (
            <View style={[styles.logoContainer, { backgroundColor: bgColor }]}>
                <Text style={[
                    styles.channelName,
                    { color: bgColor === '#FFFFFF' ? '#000000' : '#FFFFFF' }
                ]} numberOfLines={2}>
                    {channel.name}
                </Text>
            </View>
        );
    }

    if (gradient) {
        const points = angleToPoints(gradient.angle);
        return (
            <LinearGradient
                colors={gradient.colors as [string, string, ...string[]]}
                start={points.start}
                end={points.end}
                style={styles.logoContainer}
            >
                {renderLogoContent()}
            </LinearGradient>
        );
    }

    return (
        <View style={[styles.logoContainer, { backgroundColor: bgColor }]}>
            {renderLogoContent()}
        </View>
    );
};

const styles = StyleSheet.create({
    logoContainer: {
        width: 112,
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    channelName: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        textAlign: 'center',
        paddingHorizontal: spacing.xs,
    },
});
