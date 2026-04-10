import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
    AHPAlternative,
    AHPCriterion,
    AHPGlobalResult,
    AHPMatrix,
    AHPProject,
} from '../../types';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';
import { Button } from '../../components/common/Button';
import { PriorityBar } from '../../components/ahp/PriorityBar';
import { SectionDisclosure } from '../../components/common/SectionDisclosure';

interface AHPStep8ResultsScreenProps {
    project: AHPProject;
    criteria: AHPCriterion[];
    alternatives: AHPAlternative[];
    matrices: AHPMatrix[];
    results: AHPGlobalResult[];
    saving: boolean;
    onCompute: () => Promise<void>;
}

export default function AHPStep8ResultsScreen({
    project,
    criteria,
    alternatives,
    matrices,
    results,
    saving,
    onCompute,
}: AHPStep8ResultsScreenProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>AHP Ranking Results</Text>
            <Text style={styles.description}>Goal: {project.goal}</Text>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>{criteria.length} criteria</Text>
                <Text style={styles.summaryText}>{alternatives.length} alternatives</Text>
                <Text style={styles.summaryText}>{matrices.length} matrices saved</Text>
            </View>

            <Button title="Hitung Global Ranking" loading={saving} onPress={onCompute} />

            {results.length > 0 ? (
                <View style={styles.resultPanel}>
                    <PriorityBar
                        items={results.map((result) => ({
                            id: result.alternativeId,
                            name: `#${result.rank} ${result.alternativeName}`,
                            weight: result.globalScore,
                        }))}
                    />
                </View>
            ) : (
                <Text style={styles.emptyText}>
                    Belum ada hasil tersimpan. Hitung ranking setelah semua matrix pairwise terisi.
                </Text>
            )}

            <SectionDisclosure
                title="Consistency Summary"
                subtitle="CR tiap matrix yang sudah disimpan."
                iconName="clipboard-check"
            >
                {matrices.length === 0 ? (
                    <Text style={styles.emptyText}>Belum ada matrix pairwise.</Text>
                ) : (
                    matrices.map((matrix) => (
                        <View key={matrix.id} style={styles.matrixRow}>
                            <Text style={styles.matrixLabel}>
                                {matrix.level} {matrix.parentId ? `(${matrix.parentId})` : ''}
                            </Text>
                            <Text
                                style={[
                                    styles.matrixValue,
                                    { color: matrix.isConsistent ? colors.success : colors.warning },
                                ]}
                            >
                                CR {matrix.cr.toFixed(4)}
                            </Text>
                        </View>
                    ))
                )}
            </SectionDisclosure>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.lg,
    },

    title: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    description: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        lineHeight: typography.sm * typography.lineHeight.normal,
    },

    summaryCard: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
    },

    summaryText: {
        borderRadius: borderRadius.full,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
    },

    resultPanel: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.lg,
    },

    emptyText: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        lineHeight: typography.sm * typography.lineHeight.normal,
    },

    matrixRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    },

    matrixLabel: {
        flex: 1,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    matrixValue: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
    },
});
