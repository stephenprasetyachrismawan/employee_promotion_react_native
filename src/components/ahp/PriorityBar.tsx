import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';

interface PriorityBarItem {
    id?: string;
    name: string;
    weight: number;
}

interface PriorityBarProps {
    items: PriorityBarItem[];
}

const toPercent = (weight: number) => (weight <= 1 ? weight * 100 : weight);

export const PriorityBar: React.FC<PriorityBarProps> = ({ items }) => (
    <View style={styles.container}>
        {items.map((item, index) => {
            const percentage = Math.max(0, Math.min(100, toPercent(item.weight)));
            return (
                <View key={item.id ?? `${item.name}-${index}`} style={styles.item}>
                    <View style={styles.labelRow}>
                        <Text style={styles.name} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={styles.value}>{percentage.toFixed(2)}%</Text>
                    </View>
                    <View style={styles.track}>
                        <View style={[styles.fill, { width: `${percentage}%` }]} />
                    </View>
                </View>
            );
        })}
    </View>
);

const styles = StyleSheet.create({
    container: {
        gap: spacing.md,
    },

    item: {
        gap: spacing.xs,
    },

    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.md,
    },

    name: {
        flex: 1,
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    value: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.primary,
    },

    track: {
        height: 10,
        borderRadius: borderRadius.full,
        backgroundColor: colors.border,
        overflow: 'hidden',
    },

    fill: {
        height: '100%',
        minWidth: 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primary,
    },
});
