import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    AHPAlternative,
    AHPCriterion,
    AHPMatrix,
    AHPMatrixLevel,
    AHPSubCriterion,
} from '../../types';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';
import { Button } from '../../components/common/Button';
import { ConsistencyCard } from '../../components/ahp/ConsistencyCard';
import { PairwiseTable } from '../../components/ahp/PairwiseTable';
import { PriorityBar } from '../../components/ahp/PriorityBar';
import { analyzeAHPMatrix, createDefaultMatrix, setReciprocal } from '../../utils/ahp';

interface AHPStep7AltPairwiseScreenProps {
    hasSub: boolean;
    criteria: AHPCriterion[];
    subCriteria: AHPSubCriterion[];
    alternatives: AHPAlternative[];
    matrices: AHPMatrix[];
    saving: boolean;
    onSave: (
        level: AHPMatrixLevel,
        parentId: string,
        alternativeIds: string[],
        matrix: number[][]
    ) => Promise<void>;
}

interface Target {
    id: string;
    name: string;
    level: AHPMatrixLevel;
}

export default function AHPStep7AltPairwiseScreen({
    hasSub,
    criteria,
    subCriteria,
    alternatives,
    matrices,
    saving,
    onSave,
}: AHPStep7AltPairwiseScreenProps) {
    const targets: Target[] = hasSub
        ? subCriteria.map((item) => ({
            id: item.id,
            name: item.name,
            level: 'alternative_per_sub' as const,
        }))
        : criteria.map((criterion) => ({
            id: criterion.id,
            name: criterion.name,
            level: 'alternative_per_criterion' as const,
        }));
    const [activeTargetId, setActiveTargetId] = useState(targets[0]?.id ?? '');
    const activeTarget =
        targets.find((target) => target.id === activeTargetId) ?? targets[0] ?? null;
    const activeMatrix = activeTarget
        ? matrices.find(
            (matrix) => matrix.level === activeTarget.level && matrix.parentId === activeTarget.id
        )
        : null;
    const [pairwiseMatrix, setPairwiseMatrix] = useState<number[][]>([]);

    useEffect(() => {
        if (!activeTarget || alternatives.length === 0) {
            setPairwiseMatrix([]);
            return;
        }
        setPairwiseMatrix(
            activeMatrix?.matrix.length === alternatives.length
                ? activeMatrix.matrix
                : createDefaultMatrix(alternatives.length)
        );
    }, [activeTarget?.id, activeMatrix, alternatives.length]);

    useEffect(() => {
        if (!activeTargetId && targets[0]) {
            setActiveTargetId(targets[0].id);
        }
    }, [activeTargetId, targets]);

    const analysis = useMemo(
        () => (pairwiseMatrix.length > 0 ? analyzeAHPMatrix(pairwiseMatrix) : null),
        [pairwiseMatrix]
    );

    if (targets.length === 0 || alternatives.length < 2 || !activeTarget || !analysis) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Alternative Pairwise</Text>
                <Text style={styles.emptyText}>
                    Siapkan target comparison dan minimal dua alternatives sebelum mengisi matrix
                    alternative.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Alternative Pairwise</Text>
            <Text style={styles.description}>
                Bandingkan alternatives terhadap target aktif: {activeTarget.name}.
            </Text>
            <View style={styles.tabRow}>
                {targets.map((target) => {
                    const active = target.id === activeTarget.id;
                    return (
                        <TouchableOpacity
                            key={target.id}
                            style={[styles.tab, active && styles.tabActive]}
                            onPress={() => setActiveTargetId(target.id)}
                        >
                            <Text style={[styles.tabText, active && styles.tabTextActive]}>
                                {target.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <PairwiseTable
                labels={alternatives.map((alternative) => alternative.name)}
                matrix={pairwiseMatrix}
                onChange={(row, column, value) =>
                    setPairwiseMatrix((current) => setReciprocal(current, row, column, value))
                }
            />
            <PriorityBar
                items={alternatives.map((alternative, index) => ({
                    id: alternative.id,
                    name: alternative.name,
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
                title="Simpan Matrix Alternative"
                loading={saving}
                onPress={() =>
                    onSave(
                        activeTarget.level,
                        activeTarget.id,
                        alternatives.map((alternative) => alternative.id),
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
