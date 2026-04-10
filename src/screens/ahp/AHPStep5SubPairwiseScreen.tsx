import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AHPCriterion, AHPMatrix, AHPSubCriterion } from '../../types';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';
import { Button } from '../../components/common/Button';
import { ConsistencyCard } from '../../components/ahp/ConsistencyCard';
import { PairwiseTable } from '../../components/ahp/PairwiseTable';
import { PriorityBar } from '../../components/ahp/PriorityBar';
import { analyzeAHPMatrix, createDefaultMatrix, setReciprocal } from '../../utils/ahp';

interface AHPStep5SubPairwiseScreenProps {
    criteria: AHPCriterion[];
    subCriteria: AHPSubCriterion[];
    matrices: AHPMatrix[];
    saving: boolean;
    onSave: (criterionId: string, subCriteriaIds: string[], matrix: number[][]) => Promise<void>;
}

export default function AHPStep5SubPairwiseScreen({
    criteria,
    subCriteria,
    matrices,
    saving,
    onSave,
}: AHPStep5SubPairwiseScreenProps) {
    const criteriaWithSub = criteria.filter(
        (criterion) =>
            subCriteria.filter((subCriterion) => subCriterion.criterionId === criterion.id).length >= 2
    );
    const [activeCriterionId, setActiveCriterionId] = useState(criteriaWithSub[0]?.id ?? '');
    const activeCriterion =
        criteriaWithSub.find((criterion) => criterion.id === activeCriterionId) ??
        criteriaWithSub[0] ??
        null;
    const activeSubCriteria = activeCriterion
        ? subCriteria.filter((subCriterion) => subCriterion.criterionId === activeCriterion.id)
        : [];
    const activeMatrix = activeCriterion
        ? matrices.find(
            (matrix) => matrix.level === 'sub_criteria' && matrix.parentId === activeCriterion.id
        )
        : null;
    const [pairwiseMatrix, setPairwiseMatrix] = useState<number[][]>([]);

    useEffect(() => {
        if (!activeCriterion || activeSubCriteria.length === 0) {
            setPairwiseMatrix([]);
            return;
        }
        setPairwiseMatrix(
            activeMatrix?.matrix.length === activeSubCriteria.length
                ? activeMatrix.matrix
                : createDefaultMatrix(activeSubCriteria.length)
        );
    }, [activeCriterion?.id, activeMatrix, activeSubCriteria.length]);

    useEffect(() => {
        if (!activeCriterionId && criteriaWithSub[0]) {
            setActiveCriterionId(criteriaWithSub[0].id);
        }
    }, [activeCriterionId, criteriaWithSub]);

    const analysis = useMemo(
        () => (pairwiseMatrix.length > 0 ? analyzeAHPMatrix(pairwiseMatrix) : null),
        [pairwiseMatrix]
    );

    if (criteriaWithSub.length === 0 || !activeCriterion || !analysis) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Sub-Criteria Pairwise</Text>
                <Text style={styles.emptyText}>
                    Tambahkan minimal dua sub-criteria pada satu criterion untuk mengisi matrix ini.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sub-Criteria Pairwise</Text>
            <View style={styles.tabRow}>
                {criteriaWithSub.map((criterion) => {
                    const active = criterion.id === activeCriterion.id;
                    return (
                        <TouchableOpacity
                            key={criterion.id}
                            style={[styles.tab, active && styles.tabActive]}
                            onPress={() => setActiveCriterionId(criterion.id)}
                        >
                            <Text style={[styles.tabText, active && styles.tabTextActive]}>
                                {criterion.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <PairwiseTable
                labels={activeSubCriteria.map((item) => item.name)}
                matrix={pairwiseMatrix}
                onChange={(row, column, value) =>
                    setPairwiseMatrix((current) => setReciprocal(current, row, column, value))
                }
            />
            <PriorityBar
                items={activeSubCriteria.map((item, index) => ({
                    id: item.id,
                    name: item.name,
                    weight: analysis.priorityVector[index],
                }))}
            />
            <ConsistencyCard
                lambdaMax={analysis.lambdaMax}
                ci={analysis.ci}
                ri={analysis.ri}
                cr={analysis.cr}
                n={pairwiseMatrix.length}
                isConsistent={analysis.isConsistent}
            />
            <Button
                title="Simpan Matrix Sub-Criteria"
                loading={saving}
                onPress={() =>
                    onSave(
                        activeCriterion.id,
                        activeSubCriteria.map((item) => item.id),
                        pairwiseMatrix
                    )
                }
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

    emptyText: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    tabRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },

    tab: {
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },

    tabActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '12',
    },

    tabText: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
    },

    tabTextActive: {
        color: colors.primary,
    },
});
