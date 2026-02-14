// Light theme colors (darker/more saturated for better contrast on light backgrounds)
const lightThemeChannelColors = [
    '#1565C0', // Blue
    '#2E7D32', // Green
    '#C62828', // Red
    '#7B1FA2', // Purple
    '#EF6C00', // Orange
    '#00838F', // Cyan
    '#AD1457', // Pink
    '#D84315', // Salmon/Red-Orange
];

// Dark theme colors (brighter/more vibrant for better contrast on dark backgrounds)
const darkThemeChannelColors = [
    '#2196F3', // Blue
    '#00C853', // Green
    '#FF1744', // Red
    '#D500F9', // Purple
    '#FF9100', // Orange
    '#00B8D4', // Cyan
    '#F91E63', // Pink
    '#FA8072', // Salmon
];

export const getColorForChannel = (index: number, mode: 'light' | 'dark' = 'dark'): string => {
    const colors = mode === 'light' ? lightThemeChannelColors : darkThemeChannelColors;
    return colors[index % colors.length];
};
