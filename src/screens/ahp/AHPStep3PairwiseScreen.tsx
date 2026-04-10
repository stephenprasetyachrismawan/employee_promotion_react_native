import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AHPCriterion, AHPMatrix } from '../../types';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';
import { PairwiseTable } from '../../components/ahp/PairwiseTable';
import { PriorityBar } from '../../components/ahp/PriorityBar';
import { ConsistencyCard } from '../../components/ahp/ConsistencyCard';
import { Button } from '../../components/common/Button';
import { analyzeAHPMatrix, createDefaultMatrix, setReciprocal } from '../../utils/ahp';

interface AHPStep3PairwiseScreenProps {
    criteria: AHPCriterion[];
    matrix: AHPMatrix | null;
    saving: boolean;
    onSave: (matrix: number[][], criteriaIds: string[]) => Promise<void>;
}

export default function AHPStep3PairwiseScreen({
    criteria,
    matrix,
    saving,
    onSave,
}: AHPStep3PairwiseScreenProps) {
    const [pairwiseMatrix, setPairwiseMatrix] = useState<number[][]>([]);

    useEffect(() => {
        if (criteria.length === 0) {
            setPairwiseMatrix([]);
            return;
        }
        setPairwiseMatrix(
            matrix?.matrix.length === criteria.length
                ? matrix.matrix
                : createDefaultMatrix(criteria.length)
        );
    }, [criteria, matrix]);

    const labels = criteria.map((criterion) => criterion.name);
    const analysis = useMemo(
        () => (pairwiseMatrix.length > 0 ? analyzeAHPMatrix(pairwiseMatrix) : null),
        [pairwiseMatrix]
    );

    if (criteria.length < 2 || !analysis) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Criteria Pairwise Comparison</Text>
                <Text style={styles.emptyText}>
                    Tambahkan minimal dua criteria sebelum mengisi matrix pairwise.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Criteria Pairwise Comparison</Text>
            <Text style={styles.description}>
                Isi perbandingan antar criteria. Bobot criteria dihitung live dari matrix ini.
            </Text>
            <PairwiseTable
                labels={labels}
                matrix={pairwiseMatrix}
                onChange={(row, column, value) =>
                    setPairwiseMatrix((current) => setReciprocal(current, row, column, value))
                }
            />
            <View style={styles.panel}>
                <Text style={styles.panelTitle}>Priority Vector</Text>
                <PriorityBar
                    items={criteria.map((criterion, index) => ({
                        id: criterion.id,
                        name: criterion.name,
                        weight: analysis.priorityVector[index],
                    }))}
                />
            </View>
            <ConsistencyCard
                lambdaMax={analysis.lambdaMax}
                ci={analysis.ci}
                ri={analysis.ri}
                cr={analysis.cr}
                n={pairwiseMatrix.length}
                isConsistent={analysis.isConsistent}
            />
            <Button
                title="Simpan Matrix Criteria"
                loading={saving}
                onPress={() => onSave(pairwiseMatrix, criteria.map((criterion) => criterion.id))}
            />
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

    emptyText: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    panel: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        gap: spacing.md,
    },

    panelTitle: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },
});
