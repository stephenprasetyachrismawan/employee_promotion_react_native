import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { borderRadius, colors, shadows, spacing, typography } from '../styles/theme';
import { Button } from '../components/common/Button';
import { BottomActionBar } from '../components/common/BottomActionBar';
import { HelpIconButton } from '../components/common/HelpIconButton';
import { SwipeableRow } from '../components/common/SwipeableRow';
import { Candidate, CriteriaGroup } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { CandidateService } from '../database/services/CandidateService';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { CriteriaService } from '../database/services/CriteriaService';
import { ExcelHandler } from '../utils/excelHandler';
import { confirmDialog, showAlert } from '../utils/dialog';
import {
    deleteGroupWithConfirmation,
    duplicateGroupWithConfirmation,
} from '../services/groupActions';

type InputView = 'candidates' | 'groups';

export default function InputDataScreen({ navigation }: any) {
    const { user } = useAuth();
    const [activeView, setActiveView] = useState<InputView>('candidates');
    const [groups, setGroups] = useState<CriteriaGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<CriteriaGroup | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [criteriaCount, setCriteriaCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [criteriaCountsByGroup, setCriteriaCountsByGroup] = useState<Record<string, number>>({});
    const [candidateCountsByGroup, setCandidateCountsByGroup] = useState<Record<string, number>>({});

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData(selectedGroup?.id ?? undefined);
        });

        return unsubscribe;
    }, [navigation, selectedGroup?.id]);

    const methodBadgeStyle = (method: string) =>
        method === 'SAW' ? styles.methodBadgeSaw : styles.methodBadgeWpm;

    const getCriteriaCount = (groupId: string) => criteriaCountsByGroup[groupId] ?? 0;
    const getCandidateCount = (groupId: string) => candidateCountsByGroup[groupId] ?? 0;

    const loadData = async (preferredGroupId?: string | null) => {
        if (!user) return;

        setLoading(true);
        try {
            const groupsData = await CriteriaGroupService.getAllByType(user.uid, 'input');
            setGroups(groupsData);

            const summaries = await Promise.all(
                groupsData.map(async (group) => {
                    const [groupCriteriaCount, groupCandidates] = await Promise.all([
                        CriteriaService.countByGroup(user.uid, group.id),
                        CandidateService.getAllByGroup(user.uid, group.id),
                    ]);

                    return {
                        groupId: group.id,
                        criteriaCount: groupCriteriaCount,
                        candidateCount: groupCandidates.length,
                        candidates: groupCandidates,
                    };
                })
            );

            setCriteriaCountsByGroup(
                summaries.reduce<Record<string, number>>((acc, item) => {
                    acc[item.groupId] = item.criteriaCount;
                    return acc;
                }, {})
            );

            setCandidateCountsByGroup(
                summaries.reduce<Record<string, number>>((acc, item) => {
                    acc[item.groupId] = item.candidateCount;
                    return acc;
                }, {})
            );

            const activeGroup = preferredGroupId
                ? groupsData.find((group) => group.id === preferredGroupId) ?? null
                : selectedGroup
                    ? groupsData.find((group) => group.id === selectedGroup.id) ?? null
                    : groupsData[0] ?? null;

            setSelectedGroup(activeGroup);

            if (activeGroup) {
                const activeSummary = summaries.find((item) => item.groupId === activeGroup.id);
                if (activeSummary) {
                    setCandidates(activeSummary.candidates);
                    setCriteriaCount(activeSummary.criteriaCount);
                } else {
                    const [candidatesData, count] = await Promise.all([
                        CandidateService.getAllByGroup(user.uid, activeGroup.id),
                        CriteriaService.countByGroup(user.uid, activeGroup.id),
                    ]);
                    setCandidates(candidatesData);
                    setCriteriaCount(count);
                }
            } else {
                setCandidates([]);
                setCriteriaCount(0);
            }
        } catch (error) {
            console.error('Error loading input data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectGroup = async (group: CriteriaGroup) => {
        if (!user) return;

        setSelectedGroup(group);
        setActiveView('candidates');
        setLoading(true);

        try {
            const [candidatesData, count] = await Promise.all([
                CandidateService.getAllByGroup(user.uid, group.id),
                CriteriaService.countByGroup(user.uid, group.id),
            ]);

            setCandidates(candidatesData);
            setCriteriaCount(count);
            setCriteriaCountsByGroup((prev) => ({ ...prev, [group.id]: count }));
            setCandidateCountsByGroup((prev) => ({ ...prev, [group.id]: candidatesData.length }));
        } catch (error) {
            console.error('Error selecting input group:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCandidate = async (candidateId: string, candidateName: string) => {
        if (!user) return;

        const confirmed = await confirmDialog({
            title: 'Delete Candidate',
            message: `Are you sure you want to delete "${candidateName}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            destructive: true,
        });

        if (!confirmed) {
            return;
        }

        try {
            await CandidateService.delete(user.uid, candidateId);
            await loadData(selectedGroup?.id ?? undefined);
        } catch (error) {
            console.error('Error deleting candidate:', error);
            showAlert('Error', 'Failed to delete candidate');
        }
    };

    const handleDeleteGroup = async (groupId: string, groupName: string) => {
        if (!user) return;
        await deleteGroupWithConfirmation({
            userId: user.uid,
            groupId,
            groupName,
            groupType: 'input',
            onDeleted: async () => {
                await loadData();
            },
        });
    };

    const handleDuplicateGroup = async (groupId: string, groupName: string) => {
        if (!user) return;
        await duplicateGroupWithConfirmation({
            userId: user.uid,
            groupId,
            groupName,
            groupType: 'input',
            onDuplicated: async (newGroupId) => {
                await loadData(newGroupId);
            },
        });
    };

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

    const renderCandidateItem = ({ item }: { item: Candidate }) => (
        <SwipeableRow
            leftActions={[
                {
                    id: `edit-${item.id}`,
                    label: 'Edit',
                    icon: 'edit',
                    color: colors.primary,
                    onPress: () =>
                        navigation.navigate('ManualEntry', {
                            candidateId: item.id,
                            mode: 'edit',
                            groupId: item.groupId,
                        }),
                },
            ]}
            rightActions={[
                {
                    id: `delete-${item.id}`,
                    label: 'Delete',
                    icon: 'trash',
                    color: colors.error,
                    onPress: () => handleDeleteCandidate(item.id, item.name),
                },
            ]}
        >
            <View style={styles.candidateCard}>
                <View style={styles.candidateContent}>
                    {item.imageUri ? (
                        <Image source={{ uri: item.imageUri }} style={styles.candidateAvatar} />
                    ) : (
                        <View style={styles.candidateIcon}>
                            <FontAwesome5 name="user" size={22} color={colors.primary} />
                        </View>
                    )}
                    <View style={styles.candidateInfo}>
                        <Text style={styles.candidateName}>{item.name}</Text>
                        <Text style={styles.candidateDate}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
            </View>
        </SwipeableRow>
    );

    const renderGroupManagerItem = ({ item }: { item: CriteriaGroup }) => {
        const isActive = selectedGroup?.id === item.id;

        return (
            <SwipeableRow
                leftActions={[
                    {
                        id: `activate-${item.id}`,
                        label: 'Aktifkan',
                        icon: 'check',
                        color: colors.success,
                        onPress: () => handleSelectGroup(item),
                    },
                ]}
                rightActions={[
                    {
                        id: `edit-${item.id}`,
                        label: 'Edit',
                        icon: 'edit',
                        color: colors.textSecondary,
                        onPress: () =>
                            navigation.navigate('InputGroupForm', {
                                groupId: item.id,
                                mode: 'edit',
                            }),
                    },
                    {
                        id: `duplicate-${item.id}`,
                        label: 'Copy',
                        icon: 'copy',
                        color: colors.primary,
                        onPress: () => handleDuplicateGroup(item.id, item.name),
                    },
                    {
                        id: `delete-${item.id}`,
                        label: 'Delete',
                        icon: 'trash',
                        color: colors.error,
                        onPress: () => handleDeleteGroup(item.id, item.name),
                    },
                ]}
            >
                <View style={[styles.groupManagerCard, isActive && styles.groupManagerCardActive]}>
                    <View style={styles.groupManagerTopRow}>
                        <View style={styles.groupManagerTitleWrap}>
                            <Text style={styles.groupManagerTitle}>{item.name}</Text>
                            {item.description ? (
                                <Text style={styles.groupManagerDesc}>{item.description}</Text>
                            ) : null}
                        </View>
                        <View style={[styles.methodBadge, methodBadgeStyle(item.method)]}>
                            <Text style={styles.methodBadgeText}>{item.method}</Text>
                        </View>
                    </View>

                    <View style={styles.groupManagerMetaRow}>
                        <View style={styles.groupMetaChip}>
                            <FontAwesome5 name="list" size={12} color={colors.textSecondary} />
                            <Text style={styles.groupMetaChipText}>
                                {getCriteriaCount(item.id)} criteria
                            </Text>
                        </View>
                        <View style={styles.groupMetaChip}>
                            <FontAwesome5 name="users" size={12} color={colors.textSecondary} />
                            <Text style={styles.groupMetaChipText}>
                                {getCandidateCount(item.id)} candidates
                            </Text>
                        </View>
                        {isActive ? (
                            <View style={styles.groupMetaChipActive}>
                                <Text style={styles.groupMetaChipActiveText}>Active</Text>
                            </View>
                        ) : null}
                    </View>

                </View>
            </SwipeableRow>
        );
    };

    const hasGroups = groups.length > 0;

    const renderCandidatesView = () => {
        if (!hasGroups) {
            return (
                <View style={styles.emptyStateLarge}>
                    <FontAwesome5 name="layer-group" size={56} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Belum ada Group Input</Text>
                    <Text style={styles.emptySubtitle}>Tambah group untuk mulai input kandidat.</Text>
                </View>
            );
        }

        return (
            <View style={styles.candidatesViewContainer}>
                <View style={styles.groupPickerPanel}>
                    <FlatList
                        data={groups}
                        horizontal
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.groupPills}
                        renderItem={({ item }) => {
                            const isActive = selectedGroup?.id === item.id;
                            return (
                                <TouchableOpacity
                                    style={[styles.groupPill, isActive && styles.groupPillActive]}
                                    onPress={() => handleSelectGroup(item)}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.groupPillText, isActive && styles.groupPillTextActive]}
                                    >
                                        {item.name}
                                    </Text>
                                    <View style={[styles.methodBadge, methodBadgeStyle(item.method)]}>
                                        <Text style={styles.methodBadgeText}>{item.method}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>

                <View style={styles.candidatesFullArea}>
                    <View style={styles.candidatesAreaHeader}>
                        <Text style={styles.candidatesAreaTitle}>
                            {selectedGroup ? selectedGroup.name : 'Candidates'}
                        </Text>
                        {selectedGroup ? (
                            <Text style={styles.candidatesAreaMeta}>
                                {getCandidateCount(selectedGroup.id)} kandidat
                            </Text>
                        ) : null}
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : selectedGroup && criteriaCount === 0 ? (
                        <View style={styles.emptyStateInline}>
                            <Text style={styles.emptyInlineTitle}>Group ini belum punya criteria.</Text>
                            <Button
                                title="Buka Criteria"
                                onPress={() => navigation.navigate('Criteria')}
                                style={styles.emptyInlineButton}
                            />
                        </View>
                    ) : candidates.length === 0 ? (
                        <View style={styles.emptyStateInline}>
                            <Text style={styles.emptyInlineTitle}>Belum ada kandidat</Text>
                            <Text style={styles.emptyInlineSubtitle}>Tambahkan kandidat untuk mulai penilaian.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={candidates}
                            renderItem={renderCandidateItem}
                            keyExtractor={(item) => item.id}
                            style={styles.candidatesList}
                            contentContainerStyle={styles.candidatesListContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        );
    };

    const renderGroupsView = () => {
        if (!hasGroups && !loading) {
            return (
                <View style={styles.emptyStateLarge}>
                    <FontAwesome5 name="layer-group" size={56} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Belum ada Group Input</Text>
                    <Text style={styles.emptySubtitle}>
                        Buat group baru untuk mulai input kandidat.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.groupManagerContainer}>
                <View style={styles.groupManagerHeader}>
                    <Text style={styles.groupManagerHeaderTitle}>Group Input Management</Text>
                    <Text style={styles.groupManagerHeaderSubtitle}>Swipe kartu untuk aksi cepat.</Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={groups}
                        renderItem={renderGroupManagerItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.groupManagerList}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>Input Data</Text>
                    <Text style={styles.subtitle}>Kelola kandidat per group input.</Text>
                </View>
                <HelpIconButton
                    onPress={() => navigation.navigate('HelpArticle', { topic: 'input_data' })}
                />
            </View>

            <View style={styles.viewSwitcher}>
                <TouchableOpacity
                    style={[
                        styles.viewSwitcherButton,
                        activeView === 'candidates' && styles.viewSwitcherButtonActive,
                    ]}
                    onPress={() => setActiveView('candidates')}
                >
                    <FontAwesome5
                        name="users"
                        size={14}
                        color={activeView === 'candidates' ? colors.primary : colors.textSecondary}
                    />
                    <Text
                        style={[
                            styles.viewSwitcherText,
                            activeView === 'candidates' && styles.viewSwitcherTextActive,
                        ]}
                    >
                        Candidates
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.viewSwitcherButton,
                        activeView === 'groups' && styles.viewSwitcherButtonActive,
                    ]}
                    onPress={() => setActiveView('groups')}
                >
                    <FontAwesome5
                        name="layer-group"
                        size={14}
                        color={activeView === 'groups' ? colors.primary : colors.textSecondary}
                    />
                    <Text
                        style={[
                            styles.viewSwitcherText,
                            activeView === 'groups' && styles.viewSwitcherTextActive,
                        ]}
                    >
                        Group Manager
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.contentArea}>
                {activeView === 'candidates' ? renderCandidatesView() : renderGroupsView()}
            </View>

            <BottomActionBar>
                {activeView === 'candidates' ? (
                    hasGroups ? (
                        <>
                            <Button
                                title="Manual Entry"
                                onPress={() =>
                                    navigation.navigate('ManualEntry', {
                                        mode: 'add',
                                        groupId: selectedGroup?.id,
                                    })
                                }
                                disabled={!selectedGroup || criteriaCount === 0}
                            />
                            <Button
                                title="Upload Excel"
                                onPress={() => navigation.navigate('ExcelUpload', { groupId: selectedGroup?.id })}
                                variant="secondary"
                                disabled={!selectedGroup || criteriaCount === 0}
                            />
                        </>
                    ) : (
                        <Button
                            title="Tambah Group Input"
                            onPress={() => navigation.navigate('InputGroupForm', { mode: 'add' })}
                        />
                    )
                ) : (
                    <>
                        <Button
                            title="Tambah Group Input"
                            onPress={() => navigation.navigate('InputGroupForm', { mode: 'add' })}
                        />
                        <Button
                            title="Download Template"
                            onPress={handleDownloadTemplate}
                            variant="outline"
                            disabled={!selectedGroup || criteriaCount === 0}
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: spacing.md,
    },

    headerTextWrap: {
        flex: 1,
    },

    title: {
        fontSize: typography['2xl'],
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    subtitle: {
        marginTop: spacing.xs,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    viewSwitcher: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.xs,
        flexDirection: 'row',
        gap: spacing.sm,
        ...shadows.sm,
    },

    viewSwitcherButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },

    viewSwitcherButtonActive: {
        backgroundColor: colors.primary + '12',
        borderColor: colors.primary + '35',
    },

    viewSwitcherText: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        fontWeight: typography.semibold,
    },

    viewSwitcherTextActive: {
        color: colors.primary,
    },

    contentArea: {
        flex: 1,
    },

    candidatesViewContainer: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
    },

    groupPickerPanel: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.sm,
        ...shadows.sm,
    },

    groupPills: {
        paddingHorizontal: spacing.sm,
        gap: spacing.sm,
    },

    groupPill: {
        minWidth: 170,
        minHeight: 48,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },

    groupPillActive: {
        backgroundColor: colors.primary + '12',
        borderColor: colors.primary,
    },

    groupPillText: {
        flex: 1,
        fontSize: typography.sm,
        color: colors.textSecondary,
        fontWeight: typography.semibold,
    },

    groupPillTextActive: {
        color: colors.primary,
    },

    candidatesFullArea: {
        flex: 1,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        ...shadows.sm,
    },

    candidatesAreaHeader: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    candidatesAreaTitle: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    candidatesAreaMeta: {
        fontSize: typography.xs,
        color: colors.textSecondary,
        fontWeight: typography.semibold,
    },

    candidatesList: {
        flex: 1,
    },

    candidatesListContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing['3xl'],
        gap: spacing.sm,
    },

    candidateCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        ...shadows.sm,
    },

    candidateContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    candidateIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
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

    groupManagerContainer: {
        flex: 1,
    },

    groupManagerHeader: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },

    groupManagerHeaderTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    groupManagerHeaderSubtitle: {
        marginTop: spacing.xs,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    groupManagerList: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing['4xl'],
        gap: spacing.md,
    },

    groupManagerCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.sm,
    },

    groupManagerCardActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },

    groupManagerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: spacing.md,
    },

    groupManagerTitleWrap: {
        flex: 1,
    },

    groupManagerTitle: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    groupManagerDesc: {
        marginTop: spacing.xs,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    groupManagerMetaRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },

    groupMetaChip: {
        minHeight: 32,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },

    groupMetaChipText: {
        fontSize: typography.xs,
        color: colors.textSecondary,
        fontWeight: typography.semibold,
    },

    groupMetaChipActive: {
        minHeight: 32,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },

    groupMetaChipActiveText: {
        fontSize: typography.xs,
        color: colors.surface,
        fontWeight: typography.bold,
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
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyStateLarge: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },

    emptyTitle: {
        marginTop: spacing.lg,
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
    },

    emptySubtitle: {
        marginTop: spacing.sm,
        fontSize: typography.base,
        color: colors.textTertiary,
        textAlign: 'center',
    },

    emptyStateInline: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },

    emptyInlineTitle: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        textAlign: 'center',
    },

    emptyInlineSubtitle: {
        marginTop: spacing.xs,
        fontSize: typography.sm,
        color: colors.textTertiary,
        textAlign: 'center',
    },

    emptyInlineButton: {
        marginTop: spacing.lg,
    },
});
