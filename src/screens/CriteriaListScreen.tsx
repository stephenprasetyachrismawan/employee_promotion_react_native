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
import { CriteriaGroup } from '../types';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { CriteriaService } from '../database/services/CriteriaService';
import { useAuth } from '../contexts/AuthContext';

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
            const data = await CriteriaGroupService.getAll(user.uid);
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

    const handleDelete = (id: string, name: string) => {
        if (!user) return;

        Alert.alert(
            'Delete Criteria Group',
            `Are you sure you want to delete "${name}"? This will remove all criteria and data in this group.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await CriteriaGroupService.delete(user.uid, id);
                            loadCriteria();
                        } catch (error) {
                            console.error('Error deleting criteria group:', error);
                        }
                    },
                },
            ]
        );
    };

    const handleDuplicate = (id: string, name: string) => {
        if (!user) return;

        Alert.alert(
            'Duplicate Criteria Group',
            `Duplicate "${name}" along with all criteria?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Duplicate',
                    onPress: async () => {
                        try {
                            const newGroupId = await CriteriaGroupService.duplicate(user.uid, id);
                            await loadCriteria();
                            navigation.navigate('CriteriaGroupDetail', { groupId: newGroupId });
                        } catch (error) {
                            console.error('Error duplicating criteria group:', error);
                            Alert.alert('Error', 'Failed to duplicate criteria group');
                        }
                    },
                },
            ]
        );
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
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.detailButton}
                                onPress={() =>
                                    navigation.navigate('CriteriaGroupDetail', { groupId: item.id })
                                }
                            >
                                <Text style={styles.detailButtonText}>Lihat Detail</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() =>
                                    navigation.navigate('CriteriaGroupForm', {
                                        groupId: item.id,
                                        mode: 'edit',
                                    })
                                }
                            >
                                <FontAwesome5
                                    name="edit"
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleDuplicate(item.id, item.name)}
                            >
                                <FontAwesome5
                                    name="copy"
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleDelete(item.id, item.name)}
                            >
                                <FontAwesome5 name="trash" size={20} color={colors.error} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Criteria Groups</Text>
                <Text style={styles.subtitle}>Group criteria and manage weights.</Text>
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

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CriteriaGroupForm', { mode: 'add' })}
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
        padding: spacing.lg,
        paddingTop: spacing.xl,
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
        marginBottom: spacing.md,
        ...shadows.sm,
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

    methodBadgeWpm: {
        backgroundColor: colors.primary + '20',
    },

    methodBadgeSaw: {
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

    actions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },

    actionButton: {
        padding: spacing.sm,
    },

    detailButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.background,
        borderRadius: borderRadius.full,
    },

    detailButtonText: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.primary,
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
