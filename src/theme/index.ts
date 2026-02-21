import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import { alpha } from './tokens';

export const palette = {
    brand: {
        primaryLight: '#2563EB',
        primaryDark: '#3B82F6',
        live: '#F44336',
        offline: '#6B7280',
        twitch: {
            light: '#9146FF',
            dark: '#A970FF',
        },
        kick: {
            light: '#53FC18',
            dark: '#6AFF3A',
        },
        youtube: {
            light: '#FF0000',
            dark: '#FF4444',
        }
    },
    light: {
        background: '#FFFFFF',
        surface: '#F9FAFB',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        border: 'rgba(0, 0, 0, 0.12)',
    },
    dark: {
        background: '#1E293B',
        surface: '#0F172A',
        textPrimary: '#FFFFFF',
        textSecondary: '#CBD5E1',
        border: 'rgba(255, 255, 255, 0.12)',
    }
} as const;

export const boxShadow = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    }
} as const;

export const getTheme = (mode: 'light' | 'dark') => {
    const isDark = mode === 'dark';
    const colors = isDark ? palette.dark : palette.light;

    return {
        mode,
        colors: {
            ...colors,
            primary: isDark ? palette.brand.primaryDark : palette.brand.primaryLight,
            live: palette.brand.live,
            offline: palette.brand.offline,
            twitch: isDark ? palette.brand.twitch.dark : palette.brand.twitch.light,
            kick: isDark ? palette.brand.kick.dark : palette.brand.kick.light,
            youtube: isDark ? palette.brand.youtube.dark : palette.brand.youtube.light,
        },
        shadows: boxShadow,
    };
};

export type Theme = ReturnType<typeof getTheme>;

const fontConfig = {
    fontFamily: 'Inter_400Regular',
};

/**
 * Custom React Native Paper theme matching the website's color palette.
 * Replaces default Material 3 purple accents with our blue brand colors.
 */
export const paperDarkTheme = {
    ...MD3DarkTheme,
    fonts: configureFonts({ config: fontConfig }),
    colors: {
        ...MD3DarkTheme.colors,
        // Primary
        primary: palette.brand.primaryDark,               // #3B82F6 - buttons, active states
        onPrimary: '#FFFFFF',
        primaryContainer: '#1e3a5f',
        onPrimaryContainer: '#d0e4ff',
        // Secondary
        secondary: '#10b981',                              // Green from website
        onSecondary: '#FFFFFF',
        secondaryContainer: '#064e3b',
        onSecondaryContainer: '#a7f3d0',
        // Tertiary
        tertiary: '#60a5fa',
        onTertiary: '#FFFFFF',
        tertiaryContainer: '#1e3a5f',
        onTertiaryContainer: '#bfdbfe',
        // Error
        error: '#ef4444',
        onError: '#FFFFFF',
        errorContainer: '#7f1d1d',
        onErrorContainer: '#fecaca',
        // Background & Surface
        background: palette.dark.surface,                  // #0F172A - deepest background
        onBackground: palette.dark.textPrimary,            // #FFFFFF
        surface: palette.dark.background,                  // #1E293B - cards, modals
        onSurface: palette.dark.textPrimary,               // #FFFFFF
        surfaceVariant: '#334155',                          // Slightly lighter surface
        onSurfaceVariant: palette.dark.textSecondary,      // #CBD5E1
        surfaceDisabled: 'rgba(255, 255, 255, 0.12)',
        onSurfaceDisabled: 'rgba(255, 255, 255, 0.38)',
        // Outline
        outline: 'rgba(255, 255, 255, 0.3)',               // Input borders, dividers
        outlineVariant: 'rgba(255, 255, 255, 0.12)',       // Subtle borders
        // Inverse
        inverseSurface: '#e2e8f0',
        inverseOnSurface: '#1e293b',
        inversePrimary: palette.brand.primaryLight,        // #2563EB
        // Elevation overlay
        elevation: {
            ...MD3DarkTheme.colors.elevation,
            level0: 'transparent',
            level1: '#1e293b',                             // Card backgrounds
            level2: '#263548',
            level3: '#2d3d52',
            level4: '#334155',
            level5: '#3b4963',
        },
        // Backdrop
        backdrop: 'rgba(0, 0, 0, 0.5)',
        // Disabled states (used by Stepper etc.)
        disabled: 'rgba(255, 255, 255, 0.38)',
    },
};

export const paperLightTheme = {
    ...MD3LightTheme,
    fonts: configureFonts({ config: fontConfig }),
    colors: {
        ...MD3LightTheme.colors,
        primary: palette.brand.primaryLight,               // #2563EB
        onPrimary: '#FFFFFF',
        primaryContainer: '#dbeafe',
        onPrimaryContainer: '#1e3a8a',
        secondary: '#059669',
        onSecondary: '#FFFFFF',
        secondaryContainer: '#d1fae5',
        onSecondaryContainer: '#064e3b',
        error: '#ef4444',
        onError: '#FFFFFF',
        background: palette.light.background,              // #FFFFFF
        onBackground: palette.light.textPrimary,           // #111827
        surface: palette.light.surface,                    // #F9FAFB
        onSurface: palette.light.textPrimary,              // #111827
        surfaceVariant: '#e2e8f0',
        onSurfaceVariant: palette.light.textSecondary,     // #6B7280
        outline: 'rgba(0, 0, 0, 0.3)',
        outlineVariant: 'rgba(0, 0, 0, 0.12)',
        disabled: 'rgba(0, 0, 0, 0.38)',
    },
};
