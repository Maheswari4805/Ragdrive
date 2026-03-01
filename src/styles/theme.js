// Drivedrop Design System - Google-inspired theme
export const Colors = {
    primary: '#1a73e8',
    primaryLight: '#4285f4',
    primaryDark: '#1557b0',
    accent: '#34a853',
    warning: '#fbbc04',
    error: '#ea4335',

    // Neutrals
    black: '#202124',
    darkGray: '#3c4043',
    mediumGray: '#5f6368',
    lightGray: '#dadce0',
    extraLightGray: '#f1f3f4',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceVariant: '#f8f9fa',

    // Text
    textPrimary: '#202124',
    textSecondary: '#5f6368',
    textTertiary: '#80868b',
    textOnPrimary: '#ffffff',

    // Overlay
    overlay: 'rgba(0,0,0,0.4)',
    ripple: 'rgba(26,115,232,0.12)',

    // File type colors
    folderYellow: '#f5ba13',
    docBlue: '#4285f4',
    sheetGreen: '#0f9d58',
    slideYellow: '#f4b400',
    pdfRed: '#ea4335',
    imageIndigo: '#7b1fa2',
};

export const Typography = {
    h1: {
        fontSize: 28,
        fontWeight: '400',
        letterSpacing: 0,
        color: Colors.textPrimary,
    },
    h2: {
        fontSize: 22,
        fontWeight: '400',
        letterSpacing: 0.15,
        color: Colors.textPrimary,
    },
    h3: {
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.15,
        color: Colors.textPrimary,
    },
    subtitle1: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 0.15,
        color: Colors.textPrimary,
    },
    subtitle2: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 0.1,
        color: Colors.textPrimary,
    },
    body1: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.5,
        color: Colors.textPrimary,
    },
    body2: {
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.25,
        color: Colors.textSecondary,
    },
    caption: {
        fontSize: 12,
        fontWeight: '400',
        letterSpacing: 0.4,
        color: Colors.textTertiary,
    },
    button: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 1.25,
        textTransform: 'uppercase',
    },
    overline: {
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: Colors.textTertiary,
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const BorderRadius = {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    full: 999,
};

export const Elevation = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    low: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    high: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
};

export const IconSize = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
};
