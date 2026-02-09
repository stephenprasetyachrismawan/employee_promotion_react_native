import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { Button } from '../components/common/Button';
import { Candidate, CriteriaGroup } from '../types';
import { CandidateService } from '../database/services/CandidateService';
import { CriteriaService } from '../database/services/CriteriaService';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { ExcelHandler } from '../utils/excelHandler';
import { useAuth } from '../contexts/AuthContext';
import { confirmDialog, showAlert } from '../utils/dialog';
import {
    deleteGroupWithConfirmation,
    duplicateGroupWithConfirmation,
} from '../services/groupActions';

export default function InputDataScreen({ navigation }: any) {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [groups, setGroups] = useState<CriteriaGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<CriteriaGroup | null>(null);
    const [loading, setLoading] = useState(true);
    const [criteriaCount, setCriteriaCount] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });

        return unsubscribe;
    }, [navigation]);

    const loadData = async (preferredGroupId?: string | null) => {
        if (!user) return;
        try {
            const groupsData = await CriteriaGroupService.getAllByType(user.uid, 'input');
            setGroups(groupsData);

            const activeGroup = preferredGroupId
                ? groupsData.find((group) => group.id === preferredGroupId) ?? null
                : selectedGroup
                    ? groupsData.find((group) => group.id === selectedGroup.id) ?? null
                    : groupsData[0] ?? null;
            setSelectedGroup(activeGroup);

            if (activeGroup) {
                const [candidatesData, count] = await Promise.all([
                    CandidateService.getAllByGroup(user.uid, activeGroup.id),
                    CriteriaService.countByGroup(user.uid, activeGroup.id),
                ]);
                setCandidates(candidatesData);
                setCriteriaCount(count);
            } else {
                setCandidates([]);
                setCriteriaCount(0);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!user) return;

        const confirmed = await confirmDialog({
            title: 'Delete Candidate',
            message: `Are you sure you want to delete "${name}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            destructive: true,
        });

        if (!confirmed) {
            return;
        }

        try {
            await CandidateService.delete(user.uid, id);
            await loadData();
        } catch (error) {
            console.error('Error deleting candidate:', error);
            showAlert('Error', 'Failed to delete candidate');
        }
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        if (!user) return;
        await deleteGroupWithConfirmation({
            userId: user.uid,
            groupId: id,
            groupName: name,
            groupType: 'input',
            onDeleted: loadData,
        });
    };

    const handleDuplicateGroup = async (id: string, name: string) => {
        if (!user) return;
        await duplicateGroupWithConfirmation({
            userId: user.uid,
            groupId: id,
            groupName: name,
            groupType: 'input',
            onDuplicated: async (newGroupId) => {
                await loadData(newGroupId);
            },
        });
    };

    const methodBadgeStyle = (method: string) =>
        method === 'SAW' ? styles.methodBadgeSaw : styles.methodBadgeWpm;

    const handleDownloadTemplate = async () => {
        if (!user) return;
        try {
            if (!selectedGroup) {
                showAlert('No Group', 'Please select a criteria group first');
                return;
            }
            const criteria = await CriteriaService.getByGroup(user.uid, selectedGroup.id);
            if (criteria.length === 0) {
                showAlert('No Criteria', 'Please add criteria first before downloading template');
                return;
            }
            await ExcelHandler.generateTemplate(criteria);
        } catch (error) {
            console.error('Error downloading template:', error);
            showAlert('Error', 'Failed to generate template');
        }
    };

    const renderCandidate = ({ item }: { item: Candidate }) => (
        <View style={styles.candidateCard}>
            <View style={styles.candidateContent}>
                {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={styles.candidateAvatar} />
                ) : (
                    <View style={styles.iconContainer}>
                        <FontAwesome5 name="user" size={24} color={colors.primary} />
                    </View>
                )}
                <View style={styles.candidateInfo}>
                    <Text style={styles.candidateName}>{item.name}</Text>
                    <Text style={styles.candidateDate}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                        navigation.navigate('ManualEntry', {
                            candidateId: item.id,
                            mode: 'edit',
                            groupId: item.groupId,
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Input Data</Text>
                <Text style={styles.subtitle}>Upload Excel or enter manually</Text>
            </View>

            <View style={styles.groupSection}>
                <View style={styles.groupHeader}>
                    <Text style={styles.sectionLabel}>Kelompok Input</Text>
                    <TouchableOpacity
                        style={styles.addGroupButton}
                        onPress={() => navigation.navigate('InputGroupForm', { mode: 'add' })}
                    >
                        <FontAwesome5 name="plus" size={12} color={colors.primary} />
                        <Text style={styles.addGroupText}>Tambah Grup Input</Text>
                    </TouchableOpacity>
                </View>
                {groups.length === 0 ? (
                    <View style={styles.emptyGroupCard}>
                        <Text style={styles.emptyGroupText}>
                            Belum ada grup input. Tambahkan di menu Input.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={groups}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.groupList}
                        renderItem={({ item }) => {
                            const isActive = selectedGroup?.id === item.id;
                            return (
                                <View
                                    style={[
                                        styles.groupCard,
                                        isActive && styles.groupCardActive,
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.groupCardHeader}
                                        onPress={() => {
                                            if (!user) return;
                                            setSelectedGroup(item);
                                            setLoading(true);
                                            CandidateService.getAllByGroup(user.uid, item.id)
                                                .then(setCandidates)
                                                .catch((error) =>
                                                    console.error('Error loading candidates:', error)
                                                )
                                                .finally(() => setLoading(false));
                                            CriteriaService.countByGroup(user.uid, item.id)
                                                .then(setCriteriaCount)
                                                .catch((error) =>
                                                    console.error(
                                                        'Error loading criteria count:',
                                                        error
                                                    )
                                                );
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.groupCardTitle,
                                                isActive && styles.groupCardTitleActive,
                                            ]}
                                        >
                                            {item.name}
                                        </Text>
                                        <View style={[styles.methodBadge, methodBadgeStyle(item.method)]}>
                                            <Text style={styles.methodBadgeText}>{item.method}</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <View style={styles.groupActions}>
                                        <TouchableOpacity
                                            style={styles.groupActionButton}
                                            onPress={() =>
                                                navigation.navigate('InputGroupForm', {
                                                    groupId: item.id,
                                                    mode: 'edit',
                                                })
                                            }
                                        >
                                            <FontAwesome5
                                                name="edit"
                                                size={16}
                                                color={colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.groupActionButton}
                                            onPress={() => handleDuplicateGroup(item.id, item.name)}
                                        >
                                            <FontAwesome5
                                                name="copy"
                                                size={16}
                                                color={colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.groupActionButton}
                                            onPress={() => handleDeleteGroup(item.id, item.name)}
                                        >
                                            <FontAwesome5 name="trash" size={16} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }}
                    />
                )}
            </View>

            <View style={styles.actionCards}>
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() =>
                        navigation.navigate('ManualEntry', {
                            mode: 'add',
                            groupId: selectedGroup?.id,
                        })
                    }
                    disabled={!selectedGroup}
                >
                    <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <FontAwesome5 name="edit" size={28} color={colors.primary} />
                    </View>
                    <Text style={styles.actionCardTitle}>Manual Entry</Text>
                    <Text style={styles.actionCardSubtitle}>Add candidate data manually</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() =>
                        navigation.navigate('ExcelUpload', { groupId: selectedGroup?.id })
                    }
                    disabled={!selectedGroup}
                >
                    <View style={[styles.actionIconContainer, { backgroundColor: colors.benefit + '20' }]}>
                        <FontAwesome5 name="cloud-upload-alt" size={28} color={colors.benefit} />
                    </View>
                    <Text style={styles.actionCardTitle}>Upload Excel</Text>
                    <Text style={styles.actionCardSubtitle}>Import multiple candidates</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.templateSection}>
                <Button
                    title="Download Template"
                    onPress={handleDownloadTemplate}
                    variant="outline"
                    style={styles.templateButton}
                    disabled={!selectedGroup}
                />
            </View>

            <View style={styles.listHeader}>
                <View style={styles.listHeaderContent}>
                    <Text style={styles.listTitle}>
                        {selectedGroup ? `${selectedGroup.name} • ` : ''}Candidates ({candidates.length})
                    </Text>
                    {selectedGroup ? (
                        <View
                            style={[
                                styles.methodBadge,
                                methodBadgeStyle(selectedGroup.method),
                            ]}
                        >
                            <Text style={styles.methodBadgeText}>
                                {selectedGroup.method}
                            </Text>
                        </View>
                    ) : null}
                </View>
                {selectedGroup ? (
                    <Text style={styles.methodHintText}>
                        {selectedGroup.method === 'WPM'
                            ? 'WPM: nilai input harus lebih dari 0.'
                            : 'SAW: nilai dinormalisasi (benefit/max, cost/min).'}
                    </Text>
                ) : null}
            </View>

            {selectedGroup && criteriaCount === 0 ? (
                <View style={styles.emptyState}>
                    <FontAwesome5 name="users" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No criteria configured</Text>
                    <Text style={styles.emptySubtext}>
                        Add criteria first before adding candidate data
                    </Text>
                    <Button
                        title="Go to Criteria"
                        onPress={() => navigation.navigate('Criteria')}
                        style={styles.emptyButton}
                    />
                </View>
            ) : candidates.length === 0 ? (
                <View style={styles.emptyList}>
                    <Text style={styles.emptyListText}>No candidates yet</Text>
                </View>
            ) : (
                <FlatList
                    data={candidates}
                    renderItem={renderCandidate}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
            )}
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

    groupSection: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },

    sectionLabel: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
    },

    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },

    addGroupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },

    addGroupText: {
        fontSize: typography.xs,
        color: colors.primary,
        fontWeight: typography.semibold,
    },

    groupList: {
        paddingVertical: spacing.xs,
        gap: spacing.sm,
    },

    groupCard: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        minWidth: 180,
    },

    groupCardActive: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },

    groupCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },

    groupCardTitle: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        fontWeight: typography.medium,
        flex: 1,
        marginRight: spacing.sm,
    },

    groupCardTitleActive: {
        color: colors.primary,
        fontWeight: typography.semibold,
    },

    groupActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },

    groupActionButton: {
        padding: spacing.xs,
    },

    emptyGroupCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },

    emptyGroupText: {
        fontSize: typography.sm,
        color: colors.textTertiary,
    },

    actionCards: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        marginBottom: spacing.lg,
    },

    actionCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadows.sm,
    },

    actionIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },

    actionCardTitle: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    actionCardSubtitle: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        textAlign: 'center',
    },

    templateSection: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },

    templateButton: {
        marginBottom: 0,
    },

    listHeader: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    listHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },

    listTitle: {
        fontSize: typography.lg,
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

    methodHintText: {
        marginTop: spacing.xs,
        fontSize: typography.xs,
        color: colors.textSecondary,
    },

    list: {
        padding: spacing.lg,
    },

    candidateCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
    },

    candidateContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },

    candidateAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: spacing.md,
    },

    candidateInfo: {
        flex: 1,
    },

    candidateName: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    candidateDate: {
        fontSize: typography.sm,
        color: colors.textSecondary,
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

    emptyButton: {
        marginTop: spacing.xl,
    },

    emptyList: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },

    emptyListText: {
        fontSize: typography.base,
        color: colors.textTertiary,
    },
});
