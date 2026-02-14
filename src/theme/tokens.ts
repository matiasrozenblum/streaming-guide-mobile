
export const spacing = {
    xs: 4,    // 0.25rem = 4px
    sm: 8,    // 0.5rem = 8px
    md: 16,   // 1rem = 16px
    lg: 24,   // 1.5rem = 24px
    xl: 32,   // 2rem = 32px
    xxl: 48,  // 3rem = 48px
} as const;

export const fontSize = {
    xs: 12,   // 0.75rem
    sm: 14,   // 0.875rem
    md: 16,   // 1rem
    lg: 18,   // 1.125rem
    xl: 20,   // 1.25rem
    xxl: 24,  // 1.5rem
    xxxl: 32, // 2rem
} as const;

export const fontWeight = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
} as const;

export const borderRadius = {
    sm: 4,   // 0.25rem = 4px (matches web tokens)
    md: 4,   // 0.25rem = 4px
    lg: 8,   // Use 8px
    xl: 16,  // Use 16px
    full: 9999,
} as const;

// Helper to convert hex to rgba with alpha
export const alpha = (hex: string, opacity: number): string => {
    // Basic hex to rgba conversion
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + opacity + ')';
    }
    // Handle specific color names if needed, or return transparent for safety
    if (hex === '#FFFFFF') return `rgba(255, 255, 255, ${opacity})`;
    if (hex === '#000000') return `rgba(0, 0, 0, ${opacity})`;

    // Fallback if not hex (e.g. already rgba or named color)
    return hex;
};

export const layout = {
    PIXELS_PER_MINUTE: 2,
    TIME_HEADER_HEIGHT: 40,
    ROW_HEIGHT_MOBILE: 60,
    CHANNEL_LABEL_WIDTH_MOBILE: 122,
} as const;
