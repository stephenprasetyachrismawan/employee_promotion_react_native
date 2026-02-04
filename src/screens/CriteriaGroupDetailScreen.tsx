import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { Criterion, CriteriaGroup } from '../types';
import { CriteriaService } from '../database/services/CriteriaService';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { useAuth } from '../contexts/AuthContext';
import { WeightSlider } from '../components/common/WeightSlider';

export default function CriteriaGroupDetailScreen({ route, navigation }: any) {
    const { groupId } = route.params || {};
    const { user } = useAuth();
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [group, setGroup] = useState<CriteriaGroup | null>(null);
    const [loading, setLoading] = useState(true);
    const [lockedCriteriaIds, setLockedCriteriaIds] = useState<Set<string>>(new Set());

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

    const handleDelete = (id: string, name: string) => {
        if (!user) return;

        Alert.alert('Delete Criterion', `Delete "${name}" from this group?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await CriteriaService.delete(user.uid, id);
                        loadGroupData();
                    } catch (error) {
                        console.error('Error deleting criterion:', error);
                    }
                },
            },
        ]);
    };

    const totalWeight = criteria.reduce((sum, criterion) => sum + (criterion.weight ?? 0), 0);
    const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

    const handleToggleLock = (criterionId: string) => {
        setLockedCriteriaIds((prev) => {
            const next = new Set(prev);
            if (next.has(criterionId)) {
                next.delete(criterionId);
            } else {
                next.add(criterionId);
            }
            return next;
        });
    };

    const handleWeightChange = async (criterionId: string, nextWeight: number) => {
        if (!user) return;
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
            lockedCriteriaIds.has(criterion.id)
        );
        const unlockedCriteria = criteria.filter(
            (criterion) => !lockedCriteriaIds.has(criterion.id)
        );

        if (unlockedCriteria.length === 0) {
            Alert.alert('Auto Set', 'Tidak ada kriteria yang bisa diatur otomatis.');
            return;
        }

        const lockedWeightTotal = lockedCriteria.reduce(
            (sum, criterion) => sum + (criterion.weight ?? 0),
            0
        );
        if (lockedWeightTotal > 100) {
            Alert.alert('Auto Set', 'Total bobot yang dikunci melebihi 100%.');
            return;
        }

        const remainingWeight = 100 - lockedWeightTotal;
        const baseWeight = Math.floor(remainingWeight / unlockedCriteria.length);
        const remainder = remainingWeight - baseWeight * unlockedCriteria.length;

        const nextCriteria = criteria.map((criterion) => {
            if (lockedCriteriaIds.has(criterion.id)) {
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
                    .filter((criterion) => !lockedCriteriaIds.has(criterion.id))
                    .map((criterion) =>
                        CriteriaService.updateWeight(user.uid, criterion.id, criterion.weight ?? 0)
                    )
            );
        } catch (error) {
            console.error('Error auto distributing weights:', error);
        }
    };

    const renderCriterion = ({ item }: { item: Criterion }) => {
        const isBenefit = item.impactType === 'BENEFIT';
        const iconColor = isBenefit ? colors.benefit : colors.cost;
        const isLocked = lockedCriteriaIds.has(item.id);

        return (
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
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleToggleLock(item.id)}
                    >
                        <FontAwesome5
                            name={isLocked ? 'lock' : 'lock-open'}
                            size={18}
                            color={isLocked ? colors.textSecondary : colors.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() =>
                            navigation.navigate('CriterionForm', {
                                criterionId: item.id,
                                groupId,
                                mode: 'edit',
                            })
                        }
                    >
                        <FontAwesome5 name="edit" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(item.id, item.name)}
                    >
                        <FontAwesome5 name="trash" size={20} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <FontAwesome5 name="chevron-left" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>{group?.name ?? 'Criteria Group'}</Text>
                    <Text style={styles.subtitle}>
                        {group?.description || 'Manage criteria and weights.'}
                    </Text>
                </View>
            </View>

            <View style={[styles.totalCard, isWeightValid && styles.totalCardValid]}>
                <View style={styles.totalHeader}>
                    <Text style={styles.totalLabel}>Total Weight</Text>
                    <TouchableOpacity style={styles.autoButton} onPress={handleAutoDistribute}>
                        <Text style={styles.autoButtonText}>Set Auto</Text>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.totalValue, isWeightValid && styles.totalValueValid]}>
                    {Math.round(totalWeight)}%
                </Text>
                {!isWeightValid && (
                    <Text style={styles.totalHint}>Total bobot harus 100%</Text>
                )}
            </View>

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

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CriterionForm', { mode: 'add', groupId })}
            >
                <FontAwesome5 name="plus" size={28} color={colors.surface} />
            </TouchableOpacity>
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
        marginBottom: spacing.lg,
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
        marginBottom: spacing.md,
        ...shadows.sm,
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

    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },

    actionButton: {
        padding: spacing.sm,
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

    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.lg,
    },
});
