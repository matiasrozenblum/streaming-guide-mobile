import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { ChannelWithSchedules } from '../../types/channel';
import { ProgramBlock } from './ProgramBlock';
import { getColorForChannel } from '../../utils/colors';
import { layout, alpha, spacing, fontSize, fontWeight } from '../../theme/tokens';
import { getTheme } from '../../theme';

interface Props {
    channel: ChannelWithSchedules;
    index: number;
    pixelsPerMinute: number;
    scrollX: Animated.Value;
    nowOffset: number;
}

const isSvgUrl = (url: string) => {
    const path = url.split('?')[0];
    return path.toLowerCase().endsWith('.svg');
};

interface ParsedGradient {
    colors: string[];
    angle: number;
}

const parseGradient = (value: string): ParsedGradient | null => {
    if (!value.startsWith('linear-gradient')) return null;
    // Extract content between parentheses
    const match = value.match(/linear-gradient\((.+)\)/);
    if (!match) return null;
    const inner = match[1];
    // Parse angle (e.g., "135deg")
    const angleMatch = inner.match(/^(\d+)deg/);
    const angle = angleMatch ? parseInt(angleMatch[1], 10) : 180;
    // Parse hex colors
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

export const ScheduleRow = ({ channel, index, pixelsPerMinute, scrollX, nowOffset }: Props) => {
    const theme = getTheme('dark');
    const channelColor = getColorForChannel(index, 'dark');
    const [imageError, setImageError] = useState(false);

    const logoUrl = channel.channel.logo_url;
    const rawBgColor = channel.channel.background_color;
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

    const renderLogo = () => {
        if (!logoUrl || imageError) {
            return (
                <View style={[styles.logoContainer, { backgroundColor: bgColor }]}>
                    <Text style={[
                        styles.channelName,
                        { color: bgColor === '#FFFFFF' ? '#000000' : '#FFFFFF' }
                    ]} numberOfLines={2}>
                        {channel.channel.name}
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

    return (
        <View style={styles.row}>
            {/* Sticky Channel Info */}
            <Animated.View
                style={[
                    styles.channelInfo,
                    {
                        backgroundColor: theme.colors.background,
                        borderRightColor: theme.colors.border,
                        transform: [{ translateX: scrollX }]
                    }
                ]}
                collapsable={false}
                needsOffscreenAlphaCompositing={true}
            >
                {renderLogo()}
            </Animated.View>

            {/* Now Indicator Line Segment */}
            <View
                style={[
                    styles.nowLine,
                    { left: nowOffset }
                ]}
                pointerEvents="none"
            />

            {/* Programs Track */}
            <View style={styles.programsTrack}>
                {channel.schedules.map((schedule) => (
                    <ProgramBlock
                        key={schedule.id}
                        schedule={schedule}
                        pixelsPerMinute={pixelsPerMinute}
                        channelColor={channelColor}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        height: layout.ROW_HEIGHT_MOBILE, // 60px
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
    },
    channelInfo: {
        width: layout.CHANNEL_LABEL_WIDTH_MOBILE, // 122px
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        position: 'absolute',
        left: 0,
        zIndex: 10,
    },
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
    programsTrack: {
        flex: 1,
        flexDirection: 'row',
        position: 'relative',
        height: '100%',
        marginLeft: layout.CHANNEL_LABEL_WIDTH_MOBILE, // 122px
    },
    nowLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: '#F44336',
        zIndex: 5,
    },
});
