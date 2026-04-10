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
import {
    AHPAlternative,
    AHPCriterion,
    AHPGlobalResult,
    AHPMatrix,
    AHPMatrixLevel,
    AHPProject,
    AHPSubCriterion,
} from '../../types';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import { AHPService } from '../../database/services/AHPService';
import { Button } from '../../components/common/Button';
import { BottomActionBar } from '../../components/common/BottomActionBar';
import { StepIndicator } from '../../components/ahp/StepIndicator';
import { confirmDialog, showAlert } from '../../utils/dialog';
import AHPStep1SetupScreen from './AHPStep1SetupScreen';
import AHPStep2CriteriaScreen from './AHPStep2CriteriaScreen';
import AHPStep3PairwiseScreen from './AHPStep3PairwiseScreen';
import AHPStep4SubCriteriaScreen from './AHPStep4SubCriteriaScreen';
import AHPStep5SubPairwiseScreen from './AHPStep5SubPairwiseScreen';
import AHPStep6AlternativesScreen from './AHPStep6AlternativesScreen';
import AHPStep7AltPairwiseScreen from './AHPStep7AltPairwiseScreen';
import AHPStep8ResultsScreen from './AHPStep8ResultsScreen';

const getStepLabels = (hasSub: boolean) =>
    hasSub
        ? [
            'Project',
            'Criteria',
            'Criteria Matrix',
            'Sub-Criteria',
            'Sub Matrix',
            'Alternatives',
            'Alt Matrix',
            'Results',
        ]
        : ['Project', 'Criteria', 'Criteria Matrix', 'Alternatives', 'Alt Matrix', 'Results'];

export default function AHPProjectWizardScreen({ route, navigation }: any) {
    const { projectId } = route.params || {};
    const { user } = useAuth();
    const [project, setProject] = useState<AHPProject | null>(null);
    const [criteria, setCriteria] = useState<AHPCriterion[]>([]);
    const [subCriteria, setSubCriteria] = useState<AHPSubCriterion[]>([]);
    const [alternatives, setAlternatives] = useState<AHPAlternative[]>([]);
    const [matrices, setMatrices] = useState<AHPMatrix[]>([]);
    const [results, setResults] = useState<AHPGlobalResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        loadProject();
    }, [projectId, user?.uid]);

    const stepLabels = useMemo(() => getStepLabels(!!project?.hasSub), [project?.hasSub]);
    const criteriaMatrix = matrices.find((matrix) => matrix.level === 'criteria') ?? null;
    const alternativeMatrixCount = matrices.filter(
        (matrix) =>
            matrix.level === 'alternative_per_criterion' ||
            matrix.level === 'alternative_per_sub'
    ).length;

    const loadProject = async () => {
        if (!user || !projectId) {
            return;
        }

        setLoading(true);
        try {
            const [projectData, criteriaData, subCriteriaData, alternativesData, matrixData, resultData] =
                await Promise.all([
                    AHPService.getProject(user.uid, projectId),
                    AHPService.getCriteria(user.uid, projectId),
                    AHPService.getSubCriteria(user.uid, projectId),
                    AHPService.getAlternatives(user.uid, projectId),
                    AHPService.getMatricesByProject(user.uid, projectId),
                    AHPService.getProjectResults(user.uid, projectId),
                ]);

            setProject(projectData);
            setCriteria(criteriaData);
            setSubCriteria(subCriteriaData);
            setAlternatives(alternativesData);
            setMatrices(matrixData);
            setResults(resultData ?? []);
            if (projectData) {
                setStepIndex(Math.max(0, Math.min(projectData.currentStep - 1, getStepLabels(projectData.hasSub).length - 1)));
            }
        } catch (error) {
            console.error('Error loading AHP project:', error);
            showAlert('AHP Project', 'Failed to load AHP project');
        } finally {
            setLoading(false);
        }
    };

    const refreshProjectData = async () => {
        if (!user || !projectId) {
            return;
        }
        const [projectData, criteriaData, subCriteriaData, alternativesData, matrixData, resultData] =
            await Promise.all([
                AHPService.getProject(user.uid, projectId),
                AHPService.getCriteria(user.uid, projectId),
                AHPService.getSubCriteria(user.uid, projectId),
                AHPService.getAlternatives(user.uid, projectId),
                AHPService.getMatricesByProject(user.uid, projectId),
                AHPService.getProjectResults(user.uid, projectId),
            ]);
        setProject(projectData);
        setCriteria(criteriaData);
        setSubCriteria(subCriteriaData);
        setAlternatives(alternativesData);
        setMatrices(matrixData);
        setResults(resultData ?? []);
    };

    const moveToStep = async (nextStepIndex: number) => {
        const boundedStep = Math.max(0, Math.min(stepLabels.length - 1, nextStepIndex));
        setStepIndex(boundedStep);
        if (user && projectId) {
            await AHPService.updateProject(user.uid, projectId, {
                currentStep: boundedStep + 1,
                status: 'draft',
            });
        }
    };

    const handleSaveSetup = async (data: { name: string; goal: string; hasSub: boolean }) => {
        if (!user || !project) {
            return;
        }
        if (!data.name || !data.goal) {
            showAlert('AHP Project', 'Nama project dan goal wajib diisi.');
            return;
        }

        setSaving(true);
        try {
            await AHPService.updateProject(user.uid, project.id, data);
            await refreshProjectData();
        } catch (error) {
            console.error('Error saving AHP project setup:', error);
            showAlert('AHP Project', 'Failed to save project setup');
        } finally {
            setSaving(false);
        }
    };

    const handleAddCriteria = async (name: string) => {
        if (!user || !project) return;
        await AHPService.addCriteria(user.uid, project.id, name);
        await refreshProjectData();
    };

    const handleDeleteCriteria = async (criterion: AHPCriterion) => {
        if (!user || !project) return;
        const confirmed = await confirmDialog({
            title: 'Delete Criterion',
            message: `Menghapus "${criterion.name}" akan mereset matrix criteria dan alternative terkait. Lanjutkan?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            destructive: true,
        });
        if (!confirmed) return;
        await AHPService.deleteCriteria(user.uid, project.id, criterion.id);
        await refreshProjectData();
    };

    const handleSaveCriteriaMatrix = async (matrix: number[][], criteriaIds: string[]) => {
        if (!user || !project) return;
        setSaving(true);
        try {
            await AHPService.saveMatrix(user.uid, project.id, {
                level: 'criteria',
                parentId: null,
                criteriaIds,
                matrix,
            });
            await refreshProjectData();
        } catch (error) {
            console.error('Error saving criteria matrix:', error);
            showAlert('AHP Matrix', 'Failed to save criteria matrix');
        } finally {
            setSaving(false);
        }
    };

    const handleAddSubCriteria = async (criterionId: string, name: string) => {
        if (!user || !project) return;
        await AHPService.addSubCriteria(user.uid, project.id, criterionId, name);
        await refreshProjectData();
    };

    const handleDeleteSubCriteria = async (subCriterion: AHPSubCriterion) => {
        if (!user || !project) return;
        const confirmed = await confirmDialog({
            title: 'Delete Sub-Criterion',
            message: `Menghapus "${subCriterion.name}" akan mereset matrix sub dan alternative terkait. Lanjutkan?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            destructive: true,
        });
        if (!confirmed) return;
        await AHPService.deleteSubCriteria(user.uid, project.id, subCriterion.id);
        await refreshProjectData();
    };

    const handleSaveSubMatrix = async (
        criterionId: string,
        subCriteriaIds: string[],
        matrix: number[][]
    ) => {
        if (!user || !project) return;
        setSaving(true);
        try {
            await AHPService.saveMatrix(user.uid, project.id, {
                level: 'sub_criteria',
                parentId: criterionId,
                criteriaIds: subCriteriaIds,
                matrix,
            });
            await refreshProjectData();
        } catch (error) {
            console.error('Error saving sub-criteria matrix:', error);
            showAlert('AHP Matrix', 'Failed to save sub-criteria matrix');
        } finally {
            setSaving(false);
        }
    };

    const handleAddAlternative = async (name: string) => {
        if (!user || !project) return;
        await AHPService.addAlternative(user.uid, project.id, name);
        await refreshProjectData();
    };

    const handleDeleteAlternative = async (alternative: AHPAlternative) => {
        if (!user || !project) return;
        const confirmed = await confirmDialog({
            title: 'Delete Alternative',
            message: `Menghapus "${alternative.name}" akan mereset semua matrix alternative. Lanjutkan?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            destructive: true,
        });
        if (!confirmed) return;
        await AHPService.deleteAlternative(user.uid, project.id, alternative.id);
        await refreshProjectData();
    };

    const handleSaveAlternativeMatrix = async (
        level: AHPMatrixLevel,
        parentId: string,
        alternativeIds: string[],
        matrix: number[][]
    ) => {
        if (!user || !project) return;
        setSaving(true);
        try {
            await AHPService.saveMatrix(user.uid, project.id, {
                level,
                parentId,
                alternativeIds,
                matrix,
            });
            await refreshProjectData();
        } catch (error) {
            console.error('Error saving alternative matrix:', error);
            showAlert('AHP Matrix', 'Failed to save alternative matrix');
        } finally {
            setSaving(false);
        }
    };

    const handleComputeResults = async () => {
        if (!user || !project) return;
        setSaving(true);
        try {
            const computedResults = await AHPService.computeAndSaveResults(user.uid, project.id);
            setResults(computedResults);
            await refreshProjectData();
        } catch (error) {
            console.error('Error computing AHP results:', error);
            showAlert('AHP Results', 'Failed to compute AHP results');
        } finally {
            setSaving(false);
        }
    };

    const renderActiveStep = () => {
        if (!project) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>AHP project tidak ditemukan.</Text>
                </View>
            );
        }

        if (stepIndex === 0) {
            return (
                <AHPStep1SetupScreen
                    project={project}
                    saving={saving}
                    onSave={handleSaveSetup}
                />
            );
        }

        if (stepIndex === 1) {
            return (
                <AHPStep2CriteriaScreen
                    criteria={criteria}
                    onAdd={handleAddCriteria}
                    onDelete={handleDeleteCriteria}
                />
            );
        }

        if (stepIndex === 2) {
            return (
                <AHPStep3PairwiseScreen
                    criteria={criteria}
                    matrix={criteriaMatrix}
                    saving={saving}
                    onSave={handleSaveCriteriaMatrix}
                />
            );
        }

        if (project.hasSub && stepIndex === 3) {
            return (
                <AHPStep4SubCriteriaScreen
                    criteria={criteria}
                    subCriteria={subCriteria}
                    onAdd={handleAddSubCriteria}
                    onDelete={handleDeleteSubCriteria}
                />
            );
        }

        if (project.hasSub && stepIndex === 4) {
            return (
                <AHPStep5SubPairwiseScreen
                    criteria={criteria}
                    subCriteria={subCriteria}
                    matrices={matrices}
                    saving={saving}
                    onSave={handleSaveSubMatrix}
                />
            );
        }

        const alternativesStepIndex = project.hasSub ? 5 : 3;
        const alternativeMatrixStepIndex = project.hasSub ? 6 : 4;

        if (stepIndex === alternativesStepIndex) {
            return (
                <AHPStep6AlternativesScreen
                    alternatives={alternatives}
                    affectedMatrixCount={alternativeMatrixCount}
                    onAdd={handleAddAlternative}
                    onDelete={handleDeleteAlternative}
                />
            );
        }

        if (stepIndex === alternativeMatrixStepIndex) {
            return (
                <AHPStep7AltPairwiseScreen
                    hasSub={project.hasSub}
                    criteria={criteria}
                    subCriteria={subCriteria}
                    alternatives={alternatives}
                    matrices={matrices}
                    saving={saving}
                    onSave={handleSaveAlternativeMatrix}
                />
            );
        }

        return (
            <AHPStep8ResultsScreen
                project={project}
                criteria={criteria}
                alternatives={alternatives}
                matrices={matrices}
                results={results}
                saving={saving}
                onCompute={handleComputeResults}
            />
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={colors.primary} />
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
                    <Text style={styles.title}>{project?.name ?? 'AHP Project'}</Text>
                    <Text style={styles.subtitle}>{stepLabels[stepIndex]}</Text>
                </View>
                <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() =>
                        navigation.navigate('HelpArticle', {
                            topic: stepIndex === stepLabels.length - 1 ? 'ahp_results' : 'ahp_pairwise',
                        })
                    }
                >
                    <FontAwesome5 name="question" size={16} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <StepIndicator steps={stepLabels} currentStep={stepIndex} />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {renderActiveStep()}
            </ScrollView>

            <BottomActionBar>
                {stepIndex > 0 ? (
                    <Button
                        title="Prev Step"
                        variant="secondary"
                        onPress={() => moveToStep(stepIndex - 1)}
                    />
                ) : null}
                {stepIndex < stepLabels.length - 1 ? (
                    <Button title="Next Step" onPress={() => moveToStep(stepIndex + 1)} />
                ) : (
                    <Button title="Kembali ke Projects" onPress={() => navigation.goBack()} />
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

    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyState: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.lg,
    },

    emptyText: {
        fontSize: typography.sm,
        color: colors.textSecondary,
    },
});
