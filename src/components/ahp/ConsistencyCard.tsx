import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';

interface ConsistencyCardProps {
    lambdaMax: number;
    ci: number;
    ri: number;
    cr: number;
    n: number;
    isConsistent: boolean;
}

export const ConsistencyCard: React.FC<ConsistencyCardProps> = ({
    lambdaMax,
    ci,
    ri,
    cr,
    n,
    isConsistent,
}) => {
    const statusColor = isConsistent ? colors.success : colors.warning;

    return (
        <View style={[styles.card, { borderColor: statusColor + '66' }]}>
            <View style={styles.statusRow}>
                <Text style={styles.title}>Consistency Analysis</Text>
                <Text style={[styles.status, { color: statusColor }]}>
                    {isConsistent ? 'Konsisten' : 'Tidak Konsisten'}
                </Text>
            </View>
            <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>lambda max</Text>
                <Text style={styles.metricValue}>{lambdaMax.toFixed(4)}</Text>
            </View>
            <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>CI</Text>
                <Text style={styles.metricValue}>{ci.toFixed(4)}</Text>
            </View>
            <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>RI (n={n})</Text>
                <Text style={styles.metricValue}>{ri.toFixed(2)}</Text>
            </View>
            <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>CR</Text>
                <Text style={[styles.metricValue, { color: statusColor }]}>{cr.toFixed(4)}</Text>
            </View>
            {!isConsistent ? (
                <Text style={styles.warningText}>
                    Pertimbangkan untuk merevisi perbandingan berpasangan agar CR &lt; 0.1.
                </Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.lg,
        gap: spacing.md,
    },

    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
    },

    title: {
        flex: 1,
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    status: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
    },

    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    },

    metricLabel: {
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    metricValue: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    warningText: {
        fontSize: typography.sm,
        color: colors.warning,
        lineHeight: typography.sm * typography.lineHeight.normal,
    },
});
