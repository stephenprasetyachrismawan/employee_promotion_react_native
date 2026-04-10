import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';
import { AHPProject } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { AHPService } from '../../database/services/AHPService';
import { Button } from '../../components/common/Button';
import { BottomActionBar } from '../../components/common/BottomActionBar';
import { HelpIconButton } from '../../components/common/HelpIconButton';
import { SwipeableRow } from '../../components/common/SwipeableRow';
import { confirmDialog, showAlert } from '../../utils/dialog';

interface ProjectSummary {
    criteria: number;
    alternatives: number;
}

export default function AHPProjectListScreen({ navigation }: any) {
    const { user } = useAuth();
    const [projects, setProjects] = useState<AHPProject[]>([]);
    const [summaries, setSummaries] = useState<Record<string, ProjectSummary>>({});
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [hasSub, setHasSub] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadProjects();
    }, [user?.uid]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadProjects();
        });
        return unsubscribe;
    }, [navigation, user?.uid]);

    const loadProjects = async () => {
        if (!user) {
            return;
        }

        setLoading(true);
        try {
            const data = await AHPService.getProjects(user.uid);
            setProjects(data);
            const summaryItems = await Promise.all(
                data.map(async (project) => {
                    const [criteria, alternatives] = await Promise.all([
                        AHPService.getCriteria(user.uid, project.id),
                        AHPService.getAlternatives(user.uid, project.id),
                    ]);
                    return {
                        projectId: project.id,
                        criteria: criteria.length,
                        alternatives: alternatives.length,
                    };
                })
            );
            setSummaries(
                summaryItems.reduce<Record<string, ProjectSummary>>((acc, item) => {
                    acc[item.projectId] = {
                        criteria: item.criteria,
                        alternatives: item.alternatives,
                    };
                    return acc;
                }, {})
            );
        } catch (error) {
            console.error('Error loading AHP projects:', error);
            showAlert('AHP Projects', 'Failed to load AHP projects');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setGoal('');
        setHasSub(false);
        setShowCreateForm(false);
    };

    const handleCreate = async () => {
        if (!user) {
            return;
        }
        if (!name.trim() || !goal.trim()) {
            showAlert('AHP Project', 'Nama project dan goal wajib diisi.');
            return;
        }

        setSaving(true);
        try {
            const projectId = await AHPService.createProject(
                user.uid,
                name.trim(),
                goal.trim(),
                hasSub
            );
            resetForm();
            await loadProjects();
            navigation.navigate('AHPProjectWizard', { projectId });
        } catch (error) {
            console.error('Error creating AHP project:', error);
            showAlert('AHP Project', 'Failed to create AHP project');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (project: AHPProject) => {
        if (!user) {
            return;
        }

        const confirmed = await confirmDialog({
            title: 'Delete AHP Project',
            message: `Hapus project "${project.name}" beserta semua data AHP di dalamnya?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            destructive: true,
        });
        if (!confirmed) {
            return;
        }

        try {
            await AHPService.deleteProject(user.uid, project.id);
            await loadProjects();
        } catch (error) {
            console.error('Error deleting AHP project:', error);
            showAlert('AHP Project', 'Failed to delete AHP project');
        }
    };

    const handleDuplicate = async (project: AHPProject) => {
        if (!user) {
            return;
        }

        try {
            const projectId = await AHPService.createProject(
                user.uid,
                `${project.name} (Copy)`,
                project.goal,
                project.hasSub
            );
            await loadProjects();
            navigation.navigate('AHPProjectWizard', { projectId });
        } catch (error) {
            console.error('Error duplicating AHP project:', error);
            showAlert('AHP Project', 'Failed to duplicate AHP project');
        }
    };

    const renderCreateForm = () => {
        if (!showCreateForm) {
            return null;
        }

        return (
            <View style={styles.createCard}>
                <Text style={styles.createTitle}>Project Baru</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nama project"
                    placeholderTextColor={colors.textTertiary}
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Goal / tujuan keputusan"
                    placeholderTextColor={colors.textTertiary}
                    value={goal}
                    onChangeText={setGoal}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.toggleRow, hasSub && styles.toggleRowActive]}
                    onPress={() => setHasSub((current) => !current)}
                >
                    <FontAwesome5
                        name={hasSub ? 'check-circle' : 'circle'}
                        size={16}
                        color={hasSub ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.toggleText, hasSub && styles.toggleTextActive]}>
                        Gunakan Sub-Criteria
                    </Text>
                </TouchableOpacity>
                <View style={styles.createActions}>
                    <Button title="Simpan Project" onPress={handleCreate} loading={saving} />
                    <Button title="Cancel" variant="outline" onPress={resetForm} disabled={saving} />
                </View>
            </View>
        );
    };

    const renderProject = ({ item }: { item: AHPProject }) => {
        const summary = summaries[item.id] ?? { criteria: 0, alternatives: 0 };
        const statusColor = item.status === 'complete' ? colors.success : colors.warning;

        return (
            <SwipeableRow
                containerStyle={styles.projectRow}
                leftActions={[
                    {
                        id: `open-${item.id}`,
                        label: 'Open',
                        icon: 'folder-open',
                        color: colors.primary,
                        onPress: () => navigation.navigate('AHPProjectWizard', { projectId: item.id }),
                    },
                ]}
                rightActions={[
                    {
                        id: `edit-${item.id}`,
                        label: 'Edit',
                        icon: 'edit',
                        color: colors.textSecondary,
                        onPress: () => navigation.navigate('AHPProjectWizard', { projectId: item.id }),
                    },
                    {
                        id: `copy-${item.id}`,
                        label: 'Copy',
                        icon: 'copy',
                        color: colors.primary,
                        onPress: () => handleDuplicate(item),
                    },
                    {
                        id: `delete-${item.id}`,
                        label: 'Delete',
                        icon: 'trash',
                        color: colors.error,
                        onPress: () => handleDelete(item),
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.projectCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('AHPProjectWizard', { projectId: item.id })}
                >
                    <View style={styles.projectHeader}>
                        <View style={styles.projectIcon}>
                            <FontAwesome5 name="project-diagram" size={22} color={colors.primary} />
                        </View>
                        <View style={styles.projectInfo}>
                            <Text style={styles.projectName}>{item.name}</Text>
                            <Text style={styles.projectGoal} numberOfLines={2}>
                                Goal: {item.goal}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                                {item.status === 'complete' ? 'Complete' : 'Draft'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaText}>{summary.criteria} criteria</Text>
                        <Text style={styles.metaText}>{summary.alternatives} alternatives</Text>
                        <Text style={styles.metaText}>
                            {item.hasSub ? 'With sub-criteria' : 'No sub-criteria'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </SwipeableRow>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>AHP Projects</Text>
                    <Text style={styles.subtitle}>Kelola AHP full hierarchy.</Text>
                </View>
                <HelpIconButton
                    onPress={() =>
                        navigation.navigate('HelpArticle', { topic: 'ahp_project_list' })
                    }
                />
            </View>

            {renderCreateForm()}

            {loading ? (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : projects.length === 0 ? (
                <View style={styles.emptyState}>
                    <FontAwesome5 name="project-diagram" size={60} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Belum ada AHP Project</Text>
                    <Text style={styles.emptySubtitle}>
                        Buat project untuk mulai evaluasi alternatif dengan AHP.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={projects}
                    renderItem={renderProject}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                />
            )}

            <BottomActionBar>
                <Button
                    title={showCreateForm ? 'Form Project Aktif' : 'Buat AHP Project Baru'}
                    onPress={() => setShowCreateForm(true)}
                    disabled={showCreateForm}
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
    },

    subtitle: {
        marginTop: spacing.xs,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    createCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.md,
        ...shadows.sm,
    },

    createTitle: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    input: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        padding: spacing.md,
        fontSize: typography.base,
        color: colors.textPrimary,
    },

    textArea: {
        minHeight: 96,
        textAlignVertical: 'top',
    },

    toggleRow: {
        minHeight: 48,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },

    toggleRowActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },

    toggleText: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
    },

    toggleTextActive: {
        color: colors.primary,
    },

    createActions: {
        gap: spacing.md,
    },

    list: {
        padding: spacing.lg,
        paddingTop: 0,
        paddingBottom: spacing['4xl'],
    },

    projectRow: {
        marginBottom: spacing.md,
    },

    projectCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        ...shadows.sm,
    },

    projectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },

    projectIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },

    projectInfo: {
        flex: 1,
    },

    projectName: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    projectGoal: {
        marginTop: spacing.xs,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    statusBadge: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },

    statusBadgeText: {
        fontSize: typography.xs,
        fontWeight: typography.bold,
    },

    metaRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },

    metaText: {
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        backgroundColor: colors.background,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },

    loadingState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        gap: spacing.md,
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
});
