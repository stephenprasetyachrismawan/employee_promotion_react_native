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
import { CriteriaGroup } from '../types';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { CriteriaService } from '../database/services/CriteriaService';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { BottomActionBar } from '../components/common/BottomActionBar';
import { HelpIconButton } from '../components/common/HelpIconButton';
import { SwipeableRow } from '../components/common/SwipeableRow';
import {
    deleteGroupWithConfirmation,
    duplicateGroupWithConfirmation,
} from '../services/groupActions';

export default function CriteriaListScreen({ navigation }: any) {
    const { user } = useAuth();
    const [groups, setGroups] = useState<CriteriaGroup[]>([]);
    const [criteriaCounts, setCriteriaCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadCriteria();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadCriteria();
        });

        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        setExpandedGroups((prev) => {
            const next: Record<string, boolean> = {};
            groups.forEach((group) => {
                next[group.id] = prev[group.id] ?? true;
            });
            return next;
        });
    }, [groups]);

    const loadCriteria = async () => {
        if (!user) return;

        try {
            const data = await CriteriaGroupService.getAllByType(user.uid, 'criteria');
            setGroups(data);
            const counts = await Promise.all(
                data.map(async (group) => ({
                    groupId: group.id,
                    count: await CriteriaService.countByGroup(user.uid, group.id),
                }))
            );
            const countMap = counts.reduce<Record<string, number>>((acc, item) => {
                acc[item.groupId] = item.count;
                return acc;
            }, {});
            setCriteriaCounts(countMap);
        } catch (error) {
            console.error('Error loading criteria groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!user) return;
        await deleteGroupWithConfirmation({
            userId: user.uid,
            groupId: id,
            groupName: name,
            groupType: 'criteria',
            onDeleted: loadCriteria,
        });
    };

    const handleDuplicate = async (id: string, name: string) => {
        if (!user) return;
        await duplicateGroupWithConfirmation({
            userId: user.uid,
            groupId: id,
            groupName: name,
            groupType: 'criteria',
            onDuplicated: async (newGroupId) => {
                await loadCriteria();
                navigation.navigate('CriteriaGroupDetail', { groupId: newGroupId });
            },
        });
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
    };

    const renderGroup = ({ item }: { item: CriteriaGroup }) => {
        const count = criteriaCounts[item.id] ?? 0;
        const isExpanded = expandedGroups[item.id] ?? true;

        return (
            <SwipeableRow
                containerStyle={styles.groupRow}
                rightActions={[
                    {
                        id: 'edit',
                        label: 'Edit',
                        icon: 'edit',
                        color: colors.textSecondary,
                        onPress: () =>
                            navigation.navigate('CriteriaGroupForm', {
                                groupId: item.id,
                                mode: 'edit',
                            }),
                    },
                    {
                        id: 'duplicate',
                        label: 'Copy',
                        icon: 'copy',
                        color: colors.primary,
                        onPress: () => handleDuplicate(item.id, item.name),
                    },
                    {
                        id: 'delete',
                        label: 'Delete',
                        icon: 'trash',
                        color: colors.error,
                        onPress: () => handleDelete(item.id, item.name),
                    },
                ]}
                leftActions={[
                    {
                        id: 'detail',
                        label: 'Detail',
                        icon: 'eye',
                        color: colors.benefit,
                        onPress: () =>
                            navigation.navigate('CriteriaGroupDetail', { groupId: item.id }),
                    },
                ]}
            >
                <View style={styles.groupCard}>
                    <TouchableOpacity
                        style={styles.groupHeader}
                        activeOpacity={0.7}
                        onPress={() => toggleGroup(item.id)}
                    >
                        <View style={styles.groupContent}>
                            <View style={styles.iconContainer}>
                                <FontAwesome5 name="layer-group" size={24} color={colors.primary} />
                            </View>
                            <View style={styles.groupInfo}>
                                <View style={styles.groupTitleRow}>
                                    <Text style={styles.groupName}>{item.name}</Text>
                                    <View
                                        style={[
                                            styles.methodBadge,
                                            item.method === 'SAW'
                                                ? styles.methodBadgeSaw
                                                : styles.methodBadgeWpm,
                                        ]}
                                    >
                                        <Text style={styles.methodBadgeText}>{item.method}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <FontAwesome5
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>
                    {isExpanded && (
                        <View style={styles.groupDetails}>
                            <Text style={styles.groupMeta}>
                                {count} {count === 1 ? 'criterion' : 'criteria'}
                            </Text>
                            <TouchableOpacity
                                style={styles.detailButton}
                                onPress={() =>
                                    navigation.navigate('CriteriaGroupDetail', { groupId: item.id })
                                }
                            >
                                <FontAwesome5
                                    name="arrow-right"
                                    size={14}
                                    color={colors.primary}
                                />
                                <Text style={styles.detailButtonText}>Lihat Detail</Text>
                            </TouchableOpacity>
                            <Text style={styles.swipeHint}>
                                Geser kartu untuk edit, duplikat, atau hapus.
                            </Text>
                        </View>
                    )}
                </View>
            </SwipeableRow>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>Criteria Groups</Text>
                    <Text style={styles.subtitle}>Group criteria and manage weights.</Text>
                </View>
                <HelpIconButton
                    onPress={() => navigation.navigate('HelpArticle', { topic: 'criteria_list' })}
                />
            </View>

            {groups.length === 0 && !loading ? (
                <View style={styles.emptyState}>
                    <FontAwesome5 name="layer-group" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No criteria groups yet</Text>
                    <Text style={styles.emptySubtext}>
                        Add a group to organize your criteria
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={groups}
                    renderItem={renderGroup}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
            )}

            <BottomActionBar>
                <Button
                    title="Tambah Group Criteria"
                    onPress={() => navigation.navigate('CriteriaGroupForm', { mode: 'add' })}
                />
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
        padding: spacing.lg,
        paddingTop: spacing.xl,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
    },

    headerTextWrap: {
        flex: 1,
    },

    title: {
        fontSize: typography['2xl'],
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    subtitle: {
        fontSize: typography.base,
        color: colors.textSecondary,
    },

    list: {
        padding: spacing.lg,
        paddingTop: 0,
    },

    groupCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        ...shadows.sm,
    },

    groupRow: {
        marginBottom: spacing.md,
    },

    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    groupContent: {
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
        backgroundColor: colors.primary + '15',
    },

    groupInfo: {
        flex: 1,
    },

    groupTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flexWrap: 'wrap',
    },

    groupName: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    methodBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },

    methodBadgeSaw: {
        backgroundColor: colors.primary + '20',
    },

    methodBadgeWpm: {
        backgroundColor: colors.benefit + '20',
    },

    methodBadgeText: {
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    groupMeta: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },

    groupDetails: {
        marginTop: spacing.md,
    },

    detailButton: {
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        minHeight: 44,
        backgroundColor: colors.background,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },

    detailButtonText: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.primary,
    },

    swipeHint: {
        marginTop: spacing.sm,
        fontSize: typography.xs,
        color: colors.textTertiary,
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
