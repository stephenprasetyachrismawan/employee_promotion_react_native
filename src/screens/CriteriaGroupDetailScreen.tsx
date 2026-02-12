import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { Criterion, CriteriaGroup } from '../types';
import { CriteriaService } from '../database/services/CriteriaService';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { useAuth } from '../contexts/AuthContext';
import { WeightSlider } from '../components/common/WeightSlider';
import { Button } from '../components/common/Button';
import { BottomActionBar } from '../components/common/BottomActionBar';
import { HelpIconButton } from '../components/common/HelpIconButton';
import { SectionDisclosure } from '../components/common/SectionDisclosure';
import { SwipeableRow } from '../components/common/SwipeableRow';
import { confirmDialog, showAlert } from '../utils/dialog';

export default function CriteriaGroupDetailScreen({ route, navigation }: any) {
    const { groupId } = route.params || {};
    const { user } = useAuth();
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [group, setGroup] = useState<CriteriaGroup | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGroupData();
    }, [groupId]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadGroupData();
        });

        return unsubscribe;
    }, [navigation, groupId]);

    const loadGroupData = async () => {
        if (!user || !groupId) return;

        try {
            const [groupData, criteriaData] = await Promise.all([
                CriteriaGroupService.getById(user.uid, groupId),
                CriteriaService.getByGroup(user.uid, groupId),
            ]);
            setGroup(groupData);
            setCriteria(criteriaData);
        } catch (error) {
            console.error('Error loading group criteria:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!user) return;

        const confirmed = await confirmDialog({
            title: 'Delete Criterion',
            message: `Delete "${name}" from this group?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            destructive: true,
        });

        if (!confirmed) {
            return;
        }

        try {
            await CriteriaService.delete(user.uid, id);
            await loadGroupData();
        } catch (error) {
            console.error('Error deleting criterion:', error);
            showAlert('Error', 'Failed to delete criterion');
        }
    };

    const totalWeight = criteria.reduce((sum, criterion) => sum + (criterion.weight ?? 0), 0);
    const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

    const handleToggleLock = async (criterionId: string) => {
        if (!user) return;

        const targetCriterion = criteria.find((criterion) => criterion.id === criterionId);
        if (!targetCriterion) return;

        const nextLocked = !(targetCriterion.isWeightLocked ?? false);

        setCriteria((prev) =>
            prev.map((criterion) =>
                criterion.id === criterionId
                    ? { ...criterion, isWeightLocked: nextLocked }
                    : criterion
            )
        );

        try {
            await CriteriaService.updateWeightLock(user.uid, criterionId, nextLocked);
        } catch (error) {
            console.error('Error updating weight lock:', error);
            setCriteria((prev) =>
                prev.map((criterion) =>
                    criterion.id === criterionId
                        ? { ...criterion, isWeightLocked: !nextLocked }
                        : criterion
                )
            );
            showAlert('Error', 'Failed to update lock status');
        }
    };

    const handleWeightChange = async (criterionId: string, nextWeight: number) => {
        if (!user) return;
        if (criteria.find((criterion) => criterion.id === criterionId)?.isWeightLocked) {
            return;
        }
        const normalizedWeight = Math.max(1, Math.min(100, Math.round(nextWeight)));
        setCriteria((prev) =>
            prev.map((criterion) =>
                criterion.id === criterionId ? { ...criterion, weight: normalizedWeight } : criterion
            )
        );

        try {
            await CriteriaService.updateWeight(user.uid, criterionId, normalizedWeight);
        } catch (error) {
            console.error('Error updating criterion weight:', error);
        }
    };

    const handleAutoDistribute = async () => {
        if (!user) return;
        const lockedCriteria = criteria.filter((criterion) =>
            criterion.isWeightLocked
        );
        const unlockedCriteria = criteria.filter(
            (criterion) => !criterion.isWeightLocked
        );

        if (unlockedCriteria.length === 0) {
            showAlert('Auto Set', 'Tidak ada kriteria yang bisa diatur otomatis.');
            return;
        }

        const lockedWeightTotal = lockedCriteria.reduce(
            (sum, criterion) => sum + (criterion.weight ?? 0),
            0
        );
        if (lockedWeightTotal > 100) {
            showAlert('Auto Set', 'Total bobot yang dikunci melebihi 100%.');
            return;
        }

        const remainingWeight = 100 - lockedWeightTotal;
        const baseWeight = Math.floor(remainingWeight / unlockedCriteria.length);
        const remainder = remainingWeight - baseWeight * unlockedCriteria.length;

        const nextCriteria = criteria.map((criterion) => {
            if (criterion.isWeightLocked) {
                return criterion;
            }
            const unlockIndex = unlockedCriteria.findIndex(
                (unlocked) => unlocked.id === criterion.id
            );
            const distributedWeight = baseWeight + (unlockIndex < remainder ? 1 : 0);
            return { ...criterion, weight: distributedWeight };
        });

        setCriteria(nextCriteria);

        try {
            await Promise.all(
                nextCriteria
                    .filter((criterion) => !criterion.isWeightLocked)
                    .map((criterion) =>
                        CriteriaService.updateWeight(user.uid, criterion.id, criterion.weight ?? 0)
                    )
            );
        } catch (error) {
            console.error('Error auto distributing weights:', error);
        }
    };

    const isReadOnly = group?.groupType === 'input' && !!group.sourceGroupId;

    const renderCriterion = ({ item }: { item: Criterion }) => {
        const isBenefit = item.impactType === 'BENEFIT';
        const iconColor = isBenefit ? colors.benefit : colors.cost;
        const isLocked = !!item.isWeightLocked;

        const card = (
            <View style={styles.criterionCard}>
                <View style={styles.criterionContent}>
                    <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                        <FontAwesome5
                            name={isBenefit ? 'arrow-up' : 'arrow-down'}
                            size={24}
                            color={iconColor}
                        />
                    </View>
                    <View style={styles.criterionInfo}>
                        <Text style={styles.criterionName}>{item.name}</Text>
                        <View style={styles.criterionMeta}>
                            <Text style={styles.metaText}>{item.impactType}</Text>
                            <Text style={styles.metaSeparator}>•</Text>
                            <Text style={styles.metaText}>{item.dataType}</Text>
                            {isLocked ? (
                                <>
                                    <Text style={styles.metaSeparator}>•</Text>
                                    <Text style={styles.lockedMeta}>Locked</Text>
                                </>
                            ) : null}
                        </View>
                        <Text style={styles.weightText}>{item.weight}%</Text>
                        <WeightSlider
                            value={item.weight ?? 0}
                            onValueChange={(value) => handleWeightChange(item.id, value)}
                            minimumValue={1}
                            maximumValue={100}
                            disabled={isLocked}
                            style={styles.weightSlider}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor={colors.border}
                            thumbTintColor={isLocked ? colors.textTertiary : colors.primary}
                        />
                    </View>
                </View>
            </View>
        );

        if (isReadOnly) {
            return <View style={styles.criterionRow}>{card}</View>;
        }

        return (
            <SwipeableRow
                containerStyle={styles.criterionRow}
                leftActions={[
                    {
                        id: 'lock',
                        label: isLocked ? 'Unlock' : 'Lock',
                        icon: isLocked ? 'lock-open' : 'lock',
                        color: colors.primary,
                        onPress: () => handleToggleLock(item.id),
                    },
                ]}
                rightActions={[
                    {
                        id: 'edit',
                        label: 'Edit',
                        icon: 'edit',
                        color: colors.textSecondary,
                        onPress: () =>
                            navigation.navigate('CriterionForm', {
                                criterionId: item.id,
                                groupId,
                                mode: 'edit',
                            }),
                    },
                    {
                        id: 'delete',
                        label: 'Delete',
                        icon: 'trash',
                        color: colors.error,
                        onPress: () => handleDelete(item.id, item.name),
                    },
                ]}
            >
                {card}
            </SwipeableRow>
        );
    };

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
                    <Text style={styles.title}>{group?.name ?? 'Criteria Group'}</Text>
                    <Text style={styles.subtitle}>
                        {group?.description || 'Manage criteria and weights.'}
                    </Text>
                </View>
                <HelpIconButton
                    onPress={() =>
                        navigation.navigate('HelpArticle', { topic: 'criteria_group_detail' })
                    }
                />
            </View>

            <View style={[styles.totalCard, isWeightValid && styles.totalCardValid]}>
                <View style={styles.totalHeader}>
                    <Text style={styles.totalLabel}>Total Weight</Text>
                    {!isReadOnly ? (
                        <TouchableOpacity style={styles.autoButton} onPress={handleAutoDistribute}>
                            <Text style={styles.autoButtonText}>Set Auto</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
                <Text style={[styles.totalValue, isWeightValid && styles.totalValueValid]}>
                    {Math.round(totalWeight)}%
                </Text>
                {!isWeightValid && (
                    <Text style={styles.totalHint}>Total bobot harus 100%</Text>
                )}
                {isReadOnly ? (
                    <Text style={styles.readOnlyHint}>
                        Kriteria grup input tidak bisa diubah.
                    </Text>
                ) : null}
            </View>

            <SectionDisclosure
                title="Panduan Interaksi"
                subtitle="Gunakan gestur untuk edit cepat."
                iconName="hand-paper"
                containerStyle={styles.guideSection}
            >
                <Text style={styles.guideText}>
                    Geser kartu kriteria untuk lock/unlock, edit, atau hapus.
                </Text>
                <Text style={styles.guideText}>
                    Bobot total harus tepat 100% sebelum hasil dapat dihitung.
                </Text>
            </SectionDisclosure>

            {criteria.length === 0 && !loading ? (
                <View style={styles.emptyState}>
                    <FontAwesome5 name="list" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No criteria yet</Text>
                    <Text style={styles.emptySubtext}>
                        Add criteria to start this group
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={criteria}
                    renderItem={renderCriterion}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
            )}

            {!isReadOnly ? (
                <BottomActionBar>
                    <Button
                        title="Tambah Criterion"
                        onPress={() => navigation.navigate('CriterionForm', { mode: 'add', groupId })}
                    />
                </BottomActionBar>
            ) : null}
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

    headerTextWrap: {
        flex: 1,
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

    title: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    subtitle: {
        fontSize: typography.base,
        color: colors.textSecondary,
    },

    totalCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.error + '40',
    },

    totalCardValid: {
        backgroundColor: colors.success + '10',
        borderColor: colors.success,
    },

    totalLabel: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },

    totalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    autoButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.primary + '15',
        borderRadius: borderRadius.md,
    },

    autoButtonText: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.primary,
    },

    totalValue: {
        fontSize: typography['2xl'],
        fontWeight: typography.bold,
        color: colors.error,
    },

    totalValueValid: {
        color: colors.success,
    },

    totalHint: {
        fontSize: typography.sm,
        color: colors.error,
        marginTop: spacing.xs,
    },

    readOnlyHint: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },

    guideSection: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },

    guideText: {
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    list: {
        padding: spacing.lg,
        paddingTop: 0,
    },

    criterionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        ...shadows.sm,
    },

    criterionRow: {
        marginBottom: spacing.md,
    },

    criterionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },

    criterionInfo: {
        flex: 1,
    },

    criterionName: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    criterionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    metaText: {
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    lockedMeta: {
        fontSize: typography.sm,
        color: colors.primary,
        fontWeight: typography.semibold,
    },

    metaSeparator: {
        fontSize: typography.sm,
        color: colors.textTertiary,
        marginHorizontal: spacing.xs,
    },

    weightText: {
        fontSize: typography.sm,
        color: colors.primary,
        marginTop: spacing.xs,
        fontWeight: typography.semibold,
    },

    weightSlider: {
        marginTop: spacing.sm,
    },

    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },

    emptyText: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        marginTop: spacing.lg,
    },

    emptySubtext: {
        fontSize: typography.base,
        color: colors.textTertiary,
        marginTop: spacing.xs,
        textAlign: 'center',
    },

});
