// Theme configuration for the app

export const colors = {
    // Primary colors
    primary: '#2563EB', // Blue
    primaryDark: '#1E40AF',
    primaryLight: '#3B82F6',

    // Semantic colors
    benefit: '#10B981', // Green for benefit indicators
    cost: '#EF4444', // Red for cost indicators

    // Neutral colors
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceLight: '#F3F4F6',

    // Text colors
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',

    // Border colors
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Dark theme colors
    dark: {
        background: '#111827',
        surface: '#1F2937',
        text: '#F9FAFB',
    },
};

export const typography = {
    // Font sizes
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,

    // Font weights
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,

    // Line heights
    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
};

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
};

export const theme = {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
};

export type Theme = typeof theme;
