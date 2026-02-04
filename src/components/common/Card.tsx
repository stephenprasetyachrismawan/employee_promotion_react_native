import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
    children,
    style,
    variant = 'default',
}) => {
    const cardStyle = [
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
        style,
    ];

    return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },

    elevated: {
        ...shadows.md,
    },

    outlined: {
        borderWidth: 1,
        borderColor: colors.border,
    },
});
