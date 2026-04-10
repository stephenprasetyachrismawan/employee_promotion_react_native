import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';
import { AHPMatrixAnalysis, CriteriaGroup, Criterion } from '../../types';
import { CriteriaGroupService } from '../../database/services/CriteriaGroupService';
import { CriteriaService } from '../../database/services/CriteriaService';
import { AHPService } from '../../database/services/AHPService';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeAHPMatrix, createDefaultMatrix, setReciprocal } from '../../utils/ahp';
import { PairwiseTable } from '../../components/ahp/PairwiseTable';
import { StepIndicator } from '../../components/ahp/StepIndicator';
import { ConsistencyCard } from '../../components/ahp/ConsistencyCard';
import { PriorityBar } from '../../components/ahp/PriorityBar';
import { BottomActionBar } from '../../components/common/BottomActionBar';
import { Button } from '../../components/common/Button';
import { SectionDisclosure } from '../../components/common/SectionDisclosure';
import { showAlert } from '../../utils/dialog';

const steps = ['Pairwise', 'Calculation', 'Consistency', 'Apply'];

const formatNumber = (value: number, digits = 4) => value.toFixed(digits);

const NumberTable: React.FC<{
    labels: string[];
    headers: string[];
    rows: number[][];
}> = ({ labels, headers, rows }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.table}>
            <View style={styles.tableRow}>
                <View style={[styles.tableCell, styles.tableHeaderCell]} />
                {headers.map((header) => (
                    <View key={header} style={[styles.tableCell, styles.tableHeaderCell]}>
                        <Text style={styles.tableHeaderText} numberOfLines={2}>
                            {header}
                        </Text>
                    </View>
                ))}
            </View>
            {rows.map((row, rowIndex) => (
                <View key={`calc-row-${rowIndex}`} style={styles.tableRow}>
                    <View style={[styles.tableCell, styles.tableHeaderCell]}>
                        <Text style={styles.tableHeaderText} numberOfLines={2}>
                            {labels[rowIndex] ?? `C${rowIndex + 1}`}
                        </Text>
                    </View>
                    {row.map((value, columnIndex) => (
                        <View key={`${rowIndex}-${columnIndex}`} style={styles.tableCell}>
                            <Text style={styles.tableValueText}>{formatNumber(value)}</Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    </ScrollView>
);

export default function AHPWeightingScreen({ route, navigation }: any) {
    const { groupId } = route.params || {};
    const { user } = useAuth();
    const [group, setGroup] = useState<CriteriaGroup | null>(null);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [matrix, setMatrix] = useState<number[][]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [groupId, user?.uid]);

    const labels = useMemo(() => criteria.map((criterion) => criterion.name), [criteria]);
    const analysis: AHPMatrixAnalysis | null = useMemo(() => {
        if (matrix.length === 0) {
            return null;
        }
        return analyzeAHPMatrix(matrix);
    }, [matrix]);

    const loadData = async () => {
        if (!user || !groupId) {
            return;
        }

        setLoading(true);
        try {
            const [groupData, criteriaData] = await Promise.all([
                CriteriaGroupService.getById(user.uid, groupId),
                CriteriaService.getByGroup(user.uid, groupId),
            ]);
            setGroup(groupData);
            setCriteria(criteriaData);

            if (criteriaData.length === 0) {
                setMatrix([]);
                setSessionId(null);
                return;
            }

            const criteriaIds = criteriaData.map((criterion) => criterion.id);
            const criteriaNames = criteriaData.map((criterion) => criterion.name);
            const existingSession = await AHPService.getWeightingSessionByGroup(user.uid, groupId);
            const canReuseSession =
                !!existingSession &&
                existingSession.criteriaIds.length === criteriaIds.length &&
                existingSession.criteriaIds.every((id, index) => id === criteriaIds[index]);

            if (canReuseSession) {
                setSessionId(existingSession.id);
                setMatrix(existingSession.pairwiseMatrix);
            } else {
                const nextSessionId = await AHPService.createWeightingSession(
                    user.uid,
                    groupId,
                    criteriaIds,
                    criteriaNames
                );
                setSessionId(nextSessionId);
                setMatrix(createDefaultMatrix(criteriaData.length));
            }
        } catch (error) {
            console.error('Error loading AHP weighting data:', error);
            showAlert('AHP Weighting', 'Failed to load AHP weighting data');
        } finally {
            setLoading(false);
        }
    };

    const persistMatrix = async () => {
        if (!user || !sessionId || matrix.length === 0) {
            return;
        }
        await AHPService.updatePairwiseMatrix(user.uid, sessionId, matrix);
    };

    const handleMatrixChange = (rowIndex: number, columnIndex: number, value: number) => {
        setMatrix((current) => setReciprocal(current, rowIndex, columnIndex, value));
    };

    const handleNext = async () => {
        setSaving(true);
        try {
            await persistMatrix();
            setCurrentStep((step) => Math.min(steps.length - 1, step + 1));
        } catch (error) {
            console.error('Error saving pairwise matrix:', error);
            showAlert('AHP Weighting', 'Failed to save pairwise matrix');
        } finally {
            setSaving(false);
        }
    };

    const handleApply = async () => {
        if (!user || !sessionId) {
            return;
        }

        setSaving(true);
        try {
            await persistMatrix();
            await AHPService.applyWeightsToGroup(user.uid, sessionId);
            showAlert('AHP Weighting', 'Bobot AHP berhasil diterapkan.');
            navigation.goBack();
        } catch (error) {
            console.error('Error applying AHP weights:', error);
            showAlert('AHP Weighting', 'Failed to apply AHP weights');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveOnly = async () => {
        setSaving(true);
        try {
            await persistMatrix();
            showAlert('AHP Weighting', 'Session AHP tersimpan tanpa mengubah bobot aktif.');
            navigation.goBack();
        } catch (error) {
            console.error('Error saving AHP session:', error);
            showAlert('AHP Weighting', 'Failed to save AHP session');
        } finally {
            setSaving(false);
        }
    };

    const renderStepContent = () => {
        if (!analysis) {
            return (
                <View style={styles.emptyState}>
                    <FontAwesome5 name="list" size={52} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Belum ada criteria</Text>
                    <Text style={styles.emptySubtitle}>
                        Tambahkan minimal dua criterion sebelum memakai AHP Weighting.
                    </Text>
                </View>
            );
        }

        if (currentStep === 0) {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pairwise Comparison Table</Text>
                    <Text style={styles.sectionText}>
                        Isi area kanan atas. Nilai reciprocal di kiri bawah dihitung otomatis.
                    </Text>
                    <PairwiseTable labels={labels} matrix={matrix} onChange={handleMatrixChange} />
                </View>
            );
        }

        if (currentStep === 1) {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Priority Vector Calculation</Text>
                    <Text style={styles.formulaText}>
                        w_i = (1/n) x sum(a_ij / sum a_kj)
                    </Text>

                    <SectionDisclosure
                        title="Column Sum"
                        subtitle="Jumlah tiap kolom matrix pairwise."
                        iconName="calculator"
                        defaultExpanded
                    >
                        <View style={styles.vectorList}>
                            {analysis.columnSums.map((value, index) => (
                                <Text key={labels[index]} style={styles.vectorText}>
                                    {labels[index]}: {formatNumber(value)}
                                </Text>
                            ))}
                        </View>
                    </SectionDisclosure>

                    <SectionDisclosure
                        title="Normalized Matrix"
                        subtitle="Setiap sel dibagi jumlah kolomnya."
                        iconName="table"
                        defaultExpanded
                    >
                        <NumberTable
                            labels={labels}
                            headers={labels}
                            rows={analysis.normalizedMatrix}
                        />
                    </SectionDisclosure>

                    <SectionDisclosure
                        title="Priority Vector"
                        subtitle="Rata-rata baris normalized matrix."
                        iconName="chart-bar"
                        defaultExpanded
                    >
                        <PriorityBar
                            items={labels.map((label, index) => ({
                                id: criteria[index].id,
                                name: label,
                                weight: analysis.priorityVector[index],
                            }))}
                        />
                    </SectionDisclosure>
                </View>
            );
        }

        if (currentStep === 2) {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Consistency Analysis</Text>
                    <ConsistencyCard
                        lambdaMax={analysis.lambdaMax}
                        ci={analysis.ci}
                        ri={analysis.ri}
                        cr={analysis.cr}
                        n={matrix.length}
                        isConsistent={analysis.isConsistent}
                    />
                    <SectionDisclosure
                        title="Weighted Sum Vector"
                        subtitle="A x w dan rasio konsistensi per criterion."
                        iconName="stream"
                    >
                        {labels.map((label, index) => (
                            <Text key={label} style={styles.vectorText}>
                                {label}: Aw={formatNumber(analysis.weightedSumVector[index])} |
                                Aw/w={formatNumber(analysis.consistencyVector[index])}
                            </Text>
                        ))}
                    </SectionDisclosure>
                    {!analysis.isConsistent ? (
                        <Button
                            title="Revisi Pairwise"
                            variant="outline"
                            onPress={() => setCurrentStep(0)}
                        />
                    ) : null}
                </View>
            );
        }

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hasil Pembobotan AHP</Text>
                <PriorityBar
                    items={labels.map((label, index) => ({
                        id: criteria[index].id,
                        name: label,
                        weight: analysis.priorityVector[index],
                    }))}
                />
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryText}>Total: 100.00%</Text>
                    <Text
                        style={[
                            styles.summaryText,
                            {
                                color: analysis.isConsistent ? colors.success : colors.warning,
                            },
                        ]}
                    >
                        CR: {analysis.cr.toFixed(4)} -{' '}
                        {analysis.isConsistent ? 'Konsisten' : 'Tidak konsisten'}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading AHP weighting...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <FontAwesome5 name="chevron-left" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>AHP Weighting</Text>
                    <Text style={styles.subtitle}>{group?.name ?? 'Criteria Group'}</Text>
                </View>
                <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() =>
                        navigation.navigate('HelpArticle', { topic: 'ahp_weighting' })
                    }
                >
                    <FontAwesome5 name="question" size={16} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <StepIndicator steps={steps} currentStep={currentStep} />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {renderStepContent()}
            </ScrollView>

            <BottomActionBar>
                {currentStep > 0 ? (
                    <Button
                        title="Prev Step"
                        variant="secondary"
                        onPress={() => setCurrentStep((step) => Math.max(0, step - 1))}
                        disabled={saving}
                    />
                ) : null}
                {currentStep < steps.length - 1 ? (
                    <Button
                        title="Next Step"
                        onPress={handleNext}
                        loading={saving}
                        disabled={matrix.length < 2}
                    />
                ) : (
                    <>
                        <Button
                            title="Terapkan Bobot Ini"
                            onPress={handleApply}
                            loading={saving}
                            disabled={!analysis?.isConsistent}
                        />
                        <Button
                            title="Simpan Tanpa Apply"
                            variant="outline"
                            onPress={handleSaveOnly}
                            disabled={saving}
                        />
                    </>
                )}
            </BottomActionBar>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    header: {
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.lg,
        paddingTop: spacing.xl,
        alignItems: 'center',
    },

    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },

    helpButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '12',
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerTextWrap: {
        flex: 1,
    },

    title: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    subtitle: {
        marginTop: spacing.xs,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    scrollView: {
        flex: 1,
    },

    content: {
        padding: spacing.lg,
        paddingTop: 0,
        paddingBottom: spacing['4xl'],
    },

    section: {
        gap: spacing.lg,
    },

    sectionTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    sectionText: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        lineHeight: typography.sm * typography.lineHeight.normal,
    },

    formulaText: {
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    vectorList: {
        gap: spacing.xs,
    },

    vectorText: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        lineHeight: typography.sm * typography.lineHeight.normal,
    },

    table: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },

    tableRow: {
        flexDirection: 'row',
    },

    tableCell: {
        width: 108,
        minHeight: 48,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        backgroundColor: colors.surface,
    },

    tableHeaderCell: {
        backgroundColor: colors.surfaceLight,
    },

    tableHeaderText: {
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        textAlign: 'center',
    },

    tableValueText: {
        fontSize: typography.xs,
        color: colors.textSecondary,
    },

    summaryCard: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },

    summaryText: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    emptyState: {
        minHeight: 320,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        padding: spacing.xl,
    },

    emptyTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.textSecondary,
    },

    emptySubtitle: {
        fontSize: typography.sm,
        color: colors.textTertiary,
        textAlign: 'center',
    },

    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },

    loadingText: {
        fontSize: typography.sm,
        color: colors.textSecondary,
    },
});
